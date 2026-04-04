from rest_framework import permissions
from django.apps import apps
from django.contrib.auth import get_user_model
from .models import CoachStudentAssignment, BookingRequest

User = get_user_model()


class IsAllowedToMessage(permissions.BasePermission):
  # Custom permission to allow messaging only between assigned coaches and students with approved bookings.
    def _student_assigned_to_coach(self, student_id, coach_id):
        return CoachStudentAssignment.objects.filter(student_id=student_id, coach_id=coach_id).exists()

    def _coach_has_approved_booking_for_student(self, coach_id, student_id):
        return BookingRequest.objects.filter(
            coach_id=coach_id,
            student_id=student_id,
            status=BookingRequest.Status.APPROVED
        ).exists()

    def has_permission(self, request, view):
        # Only authenticated users
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # For message creation via POST with recipient_id -> pre-check relationship
        if request.method == "POST":
            data = request.data if isinstance(request.data, dict) else {}
            recipient_id = data.get("recipient_id") or data.get("recipient")
            if not recipient_id:
                return False

            try:
                recipient_id = int(recipient_id)
            except Exception:
                return False

            # Student sending to coach
            if getattr(user, "role", None) == User.Role.STUDENT:
                return self._student_assigned_to_coach(student_id=user.pk, coach_id=recipient_id)

            # Coach sending to student
            if getattr(user, "role", None) == User.Role.COACH:
                return self._coach_has_approved_booking_for_student(coach_id=user.pk, student_id=recipient_id)

            # Other roles not allowed to message
            return False

        # For GET listing or other methods, allow and delegate to object-level permission checks
        return True

    def has_object_permission(self, request, view, obj):
        """
        When viewing a Conversation or Message object, ensure:
           - requester is a participant
           - and the relevant assignment/approved booking exists
        """
        user = request.user

        # Extract coach/student from object: support Conversation or Message shapes
        coach = getattr(obj, "coach", None)
        student = getattr(obj, "student", None)
        if coach is None or student is None:
            # maybe it's a Message with conversation
            conversation = getattr(obj, "conversation", None)
            if conversation:
                coach = getattr(conversation, "coach", None)
                student = getattr(conversation, "student", None)

        if coach is None or student is None:
            return False

        # Ensure requester is participant
        if user.pk not in (getattr(coach, "pk", None), getattr(student, "pk", None)):
            return False

        # If requester is student, check assignment
        if getattr(user, "role", None) == User.Role.STUDENT:
            return self._student_assigned_to_coach(student_id=user.pk, coach_id=coach.pk)

        # If requester is coach, check approved booking exists
        if getattr(user, "role", None) == User.Role.COACH:
            return self._coach_has_approved_booking_for_student(coach_id=user.pk, student_id=student.pk)

        return False