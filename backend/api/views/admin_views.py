from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

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
    #GET /api/admin/pending-users/: Return list of users where is_approved=False.
    
    qs = User.objects.filter(is_approved=False).order_by("date_joined")
    serializer = PendingUserSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def approve_user(request, user_id):
    #POST /api/admin/pending-users/<user_id>/approve/: Mark user as approved and active; create notification.
    
    user = get_object_or_404(User, pk=user_id)
    if user.is_approved:
        return Response({"detail": "user_already_approved"}, status=status.HTTP_400_BAD_REQUEST)

    user.is_approved = True
    user.is_active = True
    user.save(update_fields=["is_approved", "is_active"])

    # Create a notification for the user
    Notification.objects.create(
        recipient=user,
        notification_type=Notification.NotificationType.BOOKING_APPROVED,
        message="Your account has been approved by an administrator. You can now log in.",
    )

    return Response({"detail": "approved"}, status=status.HTTP_200_OK)



@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def reject_user(request, user_id):
    #POST /api/admin/pending-users/<user_id>/reject/: Flag user as rejected (disable account) and notify.

    user = get_object_or_404(User, pk=user_id)

    # Mark as not approved and disable login
    user.is_approved = False
    user.is_active = False
    user.save(update_fields=["is_approved", "is_active"])

    Notification.objects.create(
        recipient=user,
        notification_type=Notification.NotificationType.REJECTION_DENIED,
        message="Your registration has been rejected by an administrator. For more information contact support.",
    )

    return Response({"detail": "rejected"}, status=status.HTTP_200_OK)