from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsAllowedToMessage(permissions.BasePermission):
   # Custom permission to allow messaging only between assigned coaches and students with approved bookings.
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # For creating messages, perform the assignment/booking checks and return False -> 403
        if request.method == "POST":
            data = request.data if isinstance(request.data, dict) else {}
            recipient_id = data.get("recipient_id") or data.get("recipient")
            if not recipient_id:
                return False
            try:
                recipient_id = int(recipient_id)
            except Exception:
                return False

            # local imports to avoid circular import at module load time
            from .models import CoachStudentAssignment, BookingRequest

            try:
                recipient = User.objects.get(pk=recipient_id)
            except User.DoesNotExist:
                return False

            if getattr(user, "role", None) == User.Role.STUDENT:
                # student may message only their assigned coach
                return CoachStudentAssignment.objects.filter(student_id=user.pk, coach_id=recipient_id).exists()

            if getattr(user, "role", None) == User.Role.COACH:
                # coach may message only students with an approved booking
                return BookingRequest.objects.filter(
                    coach_id=user.pk, student_id=recipient_id, status=BookingRequest.Status.APPROVED
                ).exists()

            return False

        # For non-POST, just require authentication (object-level checks will apply as needed)
        return True

    def has_object_permission(self, request, view, obj):
        #Ensure requester is a participant (coach or student) when accessing a Conversation or Message object.
        user = request.user
        coach = getattr(obj, "coach", None)
        student = getattr(obj, "student", None)
        if coach is None or student is None:
            conv = getattr(obj, "conversation", None)
            if conv:
                coach = getattr(conv, "coach", None)
                student = getattr(conv, "student", None)
        if coach is None or student is None:
            return False
        return user.pk in (coach.pk, student.pk)