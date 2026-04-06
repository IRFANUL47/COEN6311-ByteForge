from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    CoachStudentAssignment,
    CoachAvailability,
    BookingRequest,
    Notification,
    CustomUser,
)
from ..serializers import (
    CoachListSerializer,
    CoachAvailabilitySerializer,
    BookingRequestSerializer,
    BookingRequestCreateSerializer,
    CoachStudentAssignmentSerializer,
    NotificationSerializer,
)


# ── HELPER ─────────────────────────────────────────────────────────────────────

def create_notification(recipient, notification_type, message, booking=None):
    Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        message=message,
        booking=booking,
    )


def _purge_old_slots():
    """
    Delete availability slots (and their bookings via CASCADE) whose
    start_time was more than 1 day ago. Slots that just passed are kept
    so recent history isn't immediately wiped.
    Called at the start of availability_list so lists stay clean
    without needing a background task.
    """
    from datetime import timedelta
    cutoff = timezone.now() - timedelta(days=1)
    CoachAvailability.objects.filter(start_time__lt=cutoff).delete()


# ── COACH LIST ─────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def coach_list(request):
    """
    Students and admins can browse all approved/active coaches.
    Shows whether each coach has available slots.
    """
    user = request.user
    if getattr(user, "role", None) not in (CustomUser.Role.STUDENT, CustomUser.Role.ADMIN):
        return Response(
            {"detail": "Only students and admins can browse coaches."},
            status=status.HTTP_403_FORBIDDEN
        )
 
    coaches = CustomUser.objects.filter(
        role=CustomUser.Role.COACH,
        is_approved=True,
        is_active=True,
    )
    serializer = CoachListSerializer(coaches, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ── COACH STUDENT ASSIGNMENT ───────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assignment_select_coach(request):
    """
    Student selects a coach and gets permanently assigned.
    Student can only do this once unless admin reassigns them.
    """
    user = request.user
    if getattr(user, "role", None) != CustomUser.Role.STUDENT:
        return Response(
            {"detail": "Only students can select a coach."},
            status=status.HTTP_403_FORBIDDEN
        )

    # Check if student already has an assigned coach
    if CoachStudentAssignment.objects.filter(student=user).exists():
        return Response(
            {"detail": "You already have an assigned coach. Contact admin to change."},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = CoachStudentAssignmentSerializer(
        data=request.data,
        context={"request": request}
    )
    if serializer.is_valid():
        assignment = serializer.save(student=user)
        return Response(
            CoachStudentAssignmentSerializer(assignment).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def assignment_detail(request):
    """Student views their own coach assignment."""
    user = request.user
    if getattr(user, "role", None) != CustomUser.Role.STUDENT:
        return Response(
            {"detail": "Only students can view their assignment."},
            status=status.HTTP_403_FORBIDDEN
        )
    try:
        assignment = CoachStudentAssignment.objects.get(student=user)
    except CoachStudentAssignment.DoesNotExist:
        return Response(
            {"detail": "You have not selected a coach yet."},
            status=status.HTTP_404_NOT_FOUND
        )
    serializer = CoachStudentAssignmentSerializer(assignment)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def assignment_list_admin(request):
    """Admin views all coach-student assignments."""
    user = request.user
    if not (getattr(user, "role", None) == CustomUser.Role.ADMIN or user.is_superuser):
        return Response(
            {"detail": "Only admins can view all assignments."},
            status=status.HTTP_403_FORBIDDEN
        )
    qs = CoachStudentAssignment.objects.all()
    serializer = CoachStudentAssignmentSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def assignment_reassign(request, pk):
    """Admin reassigns a student to a different coach."""
    user = request.user
    if not (getattr(user, "role", None) == CustomUser.Role.ADMIN or user.is_superuser):
        return Response(
            {"detail": "Only admins can reassign coaches."},
            status=status.HTTP_403_FORBIDDEN
        )
    assignment = get_object_or_404(CoachStudentAssignment, pk=pk)
    serializer = CoachStudentAssignmentSerializer(
        assignment,
        data=request.data,
        partial=True
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── COACH AVAILABILITY ─────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def availability_list(request):
    """
    Coach sees all their own slots.
    Student sees only their assigned coach's unbooked slots.
    """
    _purge_old_slots()
    user = request.user
    if getattr(user, "role", None) == CustomUser.Role.COACH:
        qs = CoachAvailability.objects.filter(coach=user)
    elif getattr(user, "role", None) == CustomUser.Role.STUDENT:
        try:
            assignment = CoachStudentAssignment.objects.get(student=user)
            qs = CoachAvailability.objects.filter(
                coach=assignment.coach,
                is_booked=False
            )
        except CoachStudentAssignment.DoesNotExist:
            return Response(
                {"detail": "You have not selected a coach yet."},
                status=status.HTTP_403_FORBIDDEN
            )
    else:
        return Response(
            {"detail": "Not authorized."},
            status=status.HTTP_403_FORBIDDEN
        )
    serializer = CoachAvailabilitySerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def availability_create(request):
    """Coach creates an available time slot."""
    user = request.user
    if getattr(user, "role", None) != CustomUser.Role.COACH:
        return Response(
            {"detail": "Only coaches can create availability slots."},
            status=status.HTTP_403_FORBIDDEN
        )
    # ── NEW: Deny slots in the past ──────────────────────────────
    start_time_raw = request.data.get("start_time")
    if start_time_raw:
        from dateutil.parser import parse as parse_dt
        try:
            parsed = parse_dt(str(start_time_raw))
            if parsed.tzinfo is None:
                from django.utils.timezone import make_aware
                parsed = make_aware(parsed)
            if parsed <= timezone.now():
                return Response(
                    {"detail": "Availability slots must be in the future."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as ex:
            pass  # let serializer validation catch malformed datetimes
    # ─────────────────────────────────────────────────────────────
    serializer = CoachAvailabilitySerializer(
        data=request.data,
        context={"request": request}
    )
    if serializer.is_valid():
        try:
            serializer.save(coach=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except DjangoValidationError as e:
            # full_clean() on the model raises this for unique_together violations
            messages = e.message_dict if hasattr(e, "message_dict") else {"detail": e.messages}
            # Friendly message for the duplicate slot case
            all_msgs = str(messages)
            if "already exists" in all_msgs.lower():
                return Response(
                    {"detail": "You already have a slot at that start time. Please choose a different time."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(messages, status=status.HTTP_400_BAD_REQUEST)
    # ── Flatten serializer errors into a single detail message ───
    errors = serializer.errors
    if "start_time" in errors:
        return Response(
            {"detail": errors["start_time"][0]},
            status=status.HTTP_400_BAD_REQUEST
        )
    if "end_time" in errors:
        return Response(
            {"detail": errors["end_time"][0]},
            status=status.HTTP_400_BAD_REQUEST
        )
    if "non_field_errors" in errors:
        return Response(
            {"detail": errors["non_field_errors"][0]},
            status=status.HTTP_400_BAD_REQUEST
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def availability_delete(request, pk):
    """Coach deletes an unbooked slot."""
    user = request.user
    slot = get_object_or_404(CoachAvailability, pk=pk)

    if not (getattr(user, "role", None) == CustomUser.Role.COACH and slot.coach_id == user.pk):
        return Response(
            {"detail": "Only the coach who created this slot can delete it."},
            status=status.HTTP_403_FORBIDDEN
        )
    if slot.is_booked:
        return Response(
            {"detail": "Cannot delete a slot that is already booked."},
            status=status.HTTP_400_BAD_REQUEST
        )
    slot.delete()
    return Response({"detail": "Slot deleted."}, status=status.HTTP_204_NO_CONTENT)


# ── BOOKING REQUEST ────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def booking_list(request):
    """
    Coach sees all bookings made with them.
    Student sees all their own bookings.
    Admin sees all bookings.
    """
    user = request.user
    if getattr(user, "role", None) == CustomUser.Role.COACH:
        qs = BookingRequest.objects.filter(coach=user)
    elif getattr(user, "role", None) == CustomUser.Role.STUDENT:
        qs = BookingRequest.objects.filter(student=user)
    elif getattr(user, "role", None) == CustomUser.Role.ADMIN or user.is_superuser:
        qs = BookingRequest.objects.all()
    else:
        return Response(
            {"detail": "Not authorized."},
            status=status.HTTP_403_FORBIDDEN
        )
    serializer = BookingRequestSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def booking_create(request):
    """Student creates a booking request for their assigned coach's slot."""
    user = request.user
    if getattr(user, "role", None) != CustomUser.Role.STUDENT:
        return Response(
            {"detail": "Only students can create booking requests."},
            status=status.HTTP_403_FORBIDDEN
        )

    # ── Handle cancelled bookings on this slot ───────────────────
    # The slot has a OneToOneField to BookingRequest, so a leftover
    # CANCELLED record blocks new bookings. We either block the same
    # student from rebooking, or clear the old record for a new student.
    slot_id = request.data.get("slot")
    if slot_id:
        existing_cancelled = BookingRequest.objects.filter(
            slot_id=slot_id,
            status=BookingRequest.Status.CANCELLED,
        ).first()
        if existing_cancelled:
            if existing_cancelled.student_id == user.pk:
                # Same student — block them from rebooking
                return Response(
                    {"detail": "You already cancelled a booking for this slot and cannot rebook it."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                # Different student — delete old cancelled record so slot is bookable
                existing_cancelled.delete()
    # ─────────────────────────────────────────────────────────────
    serializer = BookingRequestCreateSerializer(
        data=request.data,
        context={"request": request}
    )
    if serializer.is_valid():
        booking = serializer.save()

        # In-app notification to coach
        create_notification(
            recipient=booking.coach,
            notification_type=Notification.NotificationType.BOOKING_REQUEST,
            message=(
                f"{booking.student.first_name} {booking.student.last_name} "
                f"has requested a session on "
                f"{booking.slot.start_time.strftime('%b %d, %Y at %I:%M %p')}."
            ),
            booking=booking,
        )

        read_serializer = BookingRequestSerializer(booking)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def booking_detail(request, pk):
    """Coach, student or admin views a specific booking."""
    booking = get_object_or_404(BookingRequest, pk=pk)
    user = request.user

    is_coach   = getattr(user, "role", None) == CustomUser.Role.COACH   and booking.coach_id   == user.pk
    is_student = getattr(user, "role", None) == CustomUser.Role.STUDENT and booking.student_id == user.pk
    is_admin   = getattr(user, "role", None) == CustomUser.Role.ADMIN   or user.is_superuser

    if not (is_coach or is_student or is_admin):
        return Response(
            {"detail": "Not authorized to view this booking."},
            status=status.HTTP_403_FORBIDDEN
        )
    serializer = BookingRequestSerializer(booking)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def booking_approve(request, pk):
    """Coach directly approves a pending booking."""
    booking = get_object_or_404(BookingRequest, pk=pk)
    user = request.user

    if not (getattr(user, "role", None) == CustomUser.Role.COACH and booking.coach_id == user.pk):
        return Response(
            {"detail": "Only the assigned coach can approve this booking."},
            status=status.HTTP_403_FORBIDDEN
        )
    if booking.status != BookingRequest.Status.PENDING:
        return Response(
            {"detail": f"Cannot approve a booking with status {booking.status}."},
            status=status.HTTP_400_BAD_REQUEST
        )

    booking.status = BookingRequest.Status.APPROVED
    booking.slot.is_booked = True
    booking.slot.save()
    booking.save()

    # In-app notification to student
    create_notification(
        recipient=booking.student,
        notification_type=Notification.NotificationType.BOOKING_APPROVED,
        message=(
            f"Your booking with Coach "
            f"{booking.coach.first_name} {booking.coach.last_name} "
            f"on {booking.slot.start_time.strftime('%b %d, %Y at %I:%M %p')} "
            f"has been approved."
        ),
        booking=booking,
    )

    serializer = BookingRequestSerializer(booking)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def booking_request_rejection(request, pk):
    """
    Coach flags a booking for rejection and provides a reason.
    Sends notification to admin for review.
    Status moves to PENDING_ADMIN.
    """
    booking = get_object_or_404(BookingRequest, pk=pk)
    user = request.user

    if not (getattr(user, "role", None) == CustomUser.Role.COACH and booking.coach_id == user.pk):
        return Response(
            {"detail": "Only the assigned coach can request a rejection."},
            status=status.HTTP_403_FORBIDDEN
        )
    if booking.status != BookingRequest.Status.PENDING:
        return Response(
            {"detail": f"Cannot request rejection for a booking with status {booking.status}."},
            status=status.HTTP_400_BAD_REQUEST
        )

    rejection_note = request.data.get("rejection_note", "").strip()
    if not rejection_note:
        return Response(
            {"detail": "A rejection reason is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    booking.status         = BookingRequest.Status.PENDING_ADMIN
    booking.rejection_note = rejection_note
    booking.save()

    # In-app notification to all admins
    admins = CustomUser.objects.filter(
        role=CustomUser.Role.ADMIN,
        is_active=True
    )
    for admin in admins:
        create_notification(
            recipient=admin,
            notification_type=Notification.NotificationType.REJECTION_APPROVED,
            message=(
                f"Coach {booking.coach.first_name} {booking.coach.last_name} "
                f"has requested to reject a booking from "
                f"{booking.student.first_name} {booking.student.last_name} "
                f"on {booking.slot.start_time.strftime('%b %d, %Y at %I:%M %p')}. "
                f"Reason: {rejection_note}"
            ),
            booking=booking,
        )

    serializer = BookingRequestSerializer(booking)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_approve_rejection(request, pk):
    """
    Admin approves the coach's rejection request.
    Booking becomes REJECTED and student is notified with the reason.
    """
    booking = get_object_or_404(BookingRequest, pk=pk)
    user = request.user

    if not (getattr(user, "role", None) == CustomUser.Role.ADMIN or user.is_superuser):
        return Response(
            {"detail": "Only admins can approve rejection requests."},
            status=status.HTTP_403_FORBIDDEN
        )
    if booking.status != BookingRequest.Status.PENDING_ADMIN:
        return Response(
            {"detail": f"This booking is not pending admin review."},
            status=status.HTTP_400_BAD_REQUEST
        )
    # ── NEW: Delete the slot so it disappears entirely ───────────
    slot = booking.slot
    rejection_note = booking.rejection_note  # ← save this first
    coach_name = f"{booking.coach.first_name} {booking.coach.last_name}"
    slot_time = booking.slot.start_time.strftime('%b %d, %Y at %I:%M %p')
    student = booking.student

    booking.status = BookingRequest.Status.REJECTED
    booking.save()
    slot.delete()  # cascades — booking is also deleted after this
    # ─────────────────────────────────────────────────────────────

    # In-app notification to student with rejection reason
    create_notification(
        recipient=student,
        notification_type=Notification.NotificationType.BOOKING_REJECTED,
        message=(
            f"Your booking with Coach {coach_name} "
            f"on {slot_time} "
            f"has been rejected. Reason: {rejection_note}"
        ),
        booking=None, # booking will be deleted so don't reference it
    )
    return Response(
        {"detail": "Rejection approved. Slot and booking have been removed."},
        status=status.HTTP_200_OK
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_deny_rejection(request, pk):
    """
    Admin denies the coach's rejection request.
    Booking goes back to APPROVED and coach is notified.
    """
    booking = get_object_or_404(BookingRequest, pk=pk)
    user = request.user

    if not (getattr(user, "role", None) == CustomUser.Role.ADMIN or user.is_superuser):
        return Response(
            {"detail": "Only admins can deny rejection requests."},
            status=status.HTTP_403_FORBIDDEN
        )
    if booking.status != BookingRequest.Status.PENDING_ADMIN:
        return Response(
            {"detail": "This booking is not pending admin review."},
            status=status.HTTP_400_BAD_REQUEST
        )

    booking.status = BookingRequest.Status.APPROVED
    booking.rejection_note = ""
    booking.slot.is_booked = True
    booking.slot.save()
    booking.save()

    # In-app notification to coach
    create_notification(
        recipient=booking.coach,
        notification_type=Notification.NotificationType.REJECTION_DENIED,
        message=(
            f"Your rejection request for the booking from "
            f"{booking.student.first_name} {booking.student.last_name} "
            f"on {booking.slot.start_time.strftime('%b %d, %Y at %I:%M %p')} "
            f"was denied by the admin. The booking remains approved."
        ),
        booking=booking,
    )

    serializer = BookingRequestSerializer(booking)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def booking_cancel(request, pk):
    """Student cancels their own pending booking."""
    booking = get_object_or_404(BookingRequest, pk=pk)
    user = request.user

    if not (getattr(user, "role", None) == CustomUser.Role.STUDENT and booking.student_id == user.pk):
        return Response(
            {"detail": "Only the student who made this booking can cancel it."},
            status=status.HTTP_403_FORBIDDEN
        )
    if booking.status not in [BookingRequest.Status.PENDING, BookingRequest.Status.APPROVED]:
        return Response(
            {"detail": f"Cannot cancel a booking with status {booking.status}."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ── NEW: Free up the slot; keep booking record so we can block
    # the same student from rebooking this slot ───────────────────
    booking.slot.is_booked = False
    booking.slot.save()
    booking.status = BookingRequest.Status.CANCELLED
    booking.save()
    # ─────────────────────────────────────────────────────────────

    return Response({"detail": "Booking cancelled."}, status=status.HTTP_200_OK)


# ── NOTIFICATIONS ──────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list(request):
    """User sees all their notifications, unread first."""
    notifications = Notification.objects.filter(
        recipient=request.user
    ).order_by("is_read", "-created_at")
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_unread_count(request):
    """Returns count of unread notifications for the bell icon."""
    count = Notification.objects.filter(
        recipient=request.user,
        is_read=False
    ).count()
    return Response({"unread_count": count}, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def notification_mark_read(request, pk):
    """User marks a single notification as read."""
    notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
    notification.is_read = True
    notification.save()
    return Response({"detail": "Notification marked as read."}, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def notification_mark_all_read(request):
    """User marks all their notifications as read."""
    Notification.objects.filter(
        recipient=request.user,
        is_read=False
    ).update(is_read=True)
    return Response({"detail": "All notifications marked as read."}, status=status.HTTP_200_OK)