from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.conf import settings

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework import status

from ..serializers import PendingUserSerializer
from ..models import Notification

User = get_user_model()


class IsAdminRole(BasePermission):
    """
    Allows access only to users whose role is ADMIN.
    This is distinct from Django's built-in IsAdminUser which checks
    is_staff — our ADMIN role is a custom field on CustomUser.
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == User.Role.ADMIN
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def pending_users_list(request):
    qs = User.objects.filter(is_approved=False).order_by("date_joined")
    serializer = PendingUserSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsAdminRole])
def approve_user(request, user_id):
    user = get_object_or_404(User, pk=user_id)
    if user.is_approved:
        return Response({"detail": "User is already approved."}, status=status.HTTP_400_BAD_REQUEST)

    user.is_approved = True
    user.is_active = True
    user.save(update_fields=["is_approved", "is_active"])

    Notification.objects.create(
        recipient=user,
        notification_type=Notification.NotificationType.BOOKING_APPROVED,
        message="Your account has been approved by an administrator. You can now log in.",
    )

    try:
        send_mail(
            subject="Your CUFitness account has been approved",
            message="Hello,\n\nYour account has been approved by an administrator. You can now log in to CUFitness.",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[user.email] if user.email else [],
            fail_silently=False,
        )
    except Exception:
        pass

    return Response({"detail": "approved"}, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsAdminRole])
def reject_user(request, user_id):
    reason = request.data.get("reason", "").strip()
    user = get_object_or_404(User, pk=user_id)

    user.is_approved = False
    user.is_active = False
    user.save(update_fields=["is_approved", "is_active"])

    notif_message = "Your registration has been rejected by an administrator."
    if reason:
        notif_message += f" Reason: {reason}"

    Notification.objects.create(
        recipient=user,
        notification_type=Notification.NotificationType.REJECTION_DENIED,
        message=notif_message,
    )

    try:
        send_mail(
            subject="Your CUFitness registration has been rejected",
            message=f"Hello,\n\n{notif_message}\n\nIf you believe this is a mistake, contact support.",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[user.email] if user.email else [],
            fail_silently=False,
        )
    except Exception:
        pass

    return Response({"detail": "rejected"}, status=status.HTTP_200_OK)