from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from ..permissions import IsAllowedToMessage
from ..serializers import MessageSerializer
from ..models import Conversation, Message

User = get_user_model()


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAllowedToMessage])
def create_message(request):
    # Create a message in a conversation between a coach and student.
    data = request.data if isinstance(request.data, dict) else {}
    recipient_id = data.get("recipient_id") or data.get("recipient")
    content = data.get("content", "").strip()

    if not recipient_id or not content:
        return Response({"detail": "recipient_id and content required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        recipient = User.objects.get(pk=recipient_id)
    except User.DoesNotExist:
        return Response({"detail": "recipient not found."}, status=status.HTTP_404_NOT_FOUND)

    # Determine roles & participants
    if request.user.role == User.Role.COACH:
        coach = request.user
        student = recipient
    else:
        coach = recipient
        student = request.user

    # Get or create conversation
    conversation, _ = Conversation.objects.get_or_create(coach=coach, student=student)

    message = Message.objects.create(conversation=conversation, sender=request.user, content=content)
    serializer = MessageSerializer(message)
    return Response(serializer.data, status=status.HTTP_201_CREATED)