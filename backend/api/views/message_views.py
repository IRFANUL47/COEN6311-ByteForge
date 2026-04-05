from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..permissions import IsAllowedToMessage
from ..serializers import MessageSerializer, ConversationSerializer
from ..models import Conversation, Message, CoachStudentAssignment
from django.db.models import Max, Count, Q, Subquery, OuterRef


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAllowedToMessage])
def create_message(request):

    serializer = MessageSerializer(data=request.data, context={"request": request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    msg = serializer.save()
    return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def conversations_list(request):
    user = request.user
    # base queryset for user
    qs = Conversation.objects.filter(Q(coach=user) | Q(student=user))

    # annotate with last_message_at (should already exist), unread_count
    qs = qs.annotate(
        unread_count=Count(
            "messages",
            filter=Q(messages__read=False) & ~Q(messages__sender=user),
            distinct=False,
        )
    ).order_by("-last_message_at", "-created_at")

    # optional: prefetch last message content to avoid per-obj query
    serializer = ConversationSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def conversation_messages(request, conversation_id):
    try:
        conv = Conversation.objects.get(pk=conversation_id)
    except Conversation.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    # explicit object-level permission check (function-based view)
    perm = IsAllowedToMessage()
    if not perm.has_object_permission(request, None, conv):
        return Response(status=status.HTTP_403_FORBIDDEN)

    msgs = Message.objects.filter(conversation=conv).order_by("created_at")
    # Optional: add pagination here (LimitOffsetPagination) if needed
    serializer = MessageSerializer(msgs, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def conversation_mark_read(request, conversation_id):
    try:
        conv = Conversation.objects.get(pk=conversation_id)
    except Conversation.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    perm = IsAllowedToMessage()
    if not perm.has_object_permission(request, None, conv):
        return Response(status=status.HTTP_403_FORBIDDEN)

    user = request.user
    updated = Message.objects.filter(conversation=conv, read=False).exclude(sender=user).update(read=True)
    return Response({"updated": updated}, status=status.HTTP_200_OK)