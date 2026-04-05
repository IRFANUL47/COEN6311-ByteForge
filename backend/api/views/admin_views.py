from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.conf import settings

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from ..serializers import PendingUserSerializer
from ..models import Notification

User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def pending_users_list(request):
    # GET /api/admin/pending-users/: Return list of users where is_approved=False.
    qs = User.objects.filter(is_approved=False).order_by("date_joined")
    serializer = PendingUserSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsAdminUser])
def approve_user(request, user_id):
    # PATCH /api/admin/pending-users/<user_id>/approve/: Mark user as approved and active, create notification and send email.
    user = get_object_or_404(User, pk=user_id)
    if user.is_approved:
        return Response({"detail": "user_already_approved"}, status=status.HTTP_400_BAD_REQUEST)

    user.is_approved = True
    user.is_active = True
    user.save(update_fields=["is_approved", "is_active"])

    # Create a Notification record (audit)
    Notification.objects.create(
        recipient=user,
        notification_type=Notification.NotificationType.BOOKING_APPROVED,
        message="Your account has been approved by an administrator. You can now log in.",
    )

    # Send an email as they cannot see in-app notifications when not logged in
    try:
        send_mail(
            subject="Your CUFitness account has been approved",
            message="Hello,\n\nYour account has been approved by an administrator. You can now log in to CUFitness.",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[user.email] if user.email else [],
            fail_silently=False,
        )
    except Exception:
        # Do not block approval if email sending fails; admin can retry/send separately
        pass

    return Response({"detail": "approved"}, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsAdminUser])
def reject_user(request, user_id):
    # PATCH /api/admin/pending-users/<user_id>/reject/: Disable account and notify via email, keep a Notification record for audit. Accept optional 'reason' in request.data to include in the message.
    reason = request.data.get("reason", "").strip()
    user = get_object_or_404(User, pk=user_id)

    # Mark as not approved and disable login
    user.is_approved = False
    user.is_active = False
    user.save(update_fields=["is_approved", "is_active"])

    # Create a Notification record (audit)
    notif_message = "Your registration has been rejected by an administrator."
    if reason:
        notif_message += f" Reason: {reason}"

    Notification.objects.create(
        recipient=user,
        notification_type=Notification.NotificationType.REJECTION_DENIED,
        message=notif_message,
    )

    # Send an email because the user cannot see in-app notifications while disabled
    try:
        send_mail(
            subject="Your CUFitness registration has been rejected",
            message=f"Hello,\n\n{notif_message}\n\nIf you believe this is a mistake, contact support.",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[user.email] if user.email else [],
            fail_silently=False,
        )
    except Exception:
        # Do not block the reject operation on email failure
        pass

    return Response({"detail": "rejected"}, status=status.HTTP_200_OK)