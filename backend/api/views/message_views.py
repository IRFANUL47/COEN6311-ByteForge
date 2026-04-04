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

    serializer = MessageSerializer(data=request.data, context={"request": request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    msg = serializer.save()
    return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)