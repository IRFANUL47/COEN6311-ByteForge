from django.db import transaction, IntegrityError

def get_or_create_conversation_safe(Conversation, coach, student):
    try:
        return Conversation.objects.get(coach=coach, student=student), False
    except Conversation.DoesNotExist:
        try:
            with transaction.atomic():
                conv = Conversation.objects.create(coach=coach, student=student)
                return conv, True
        except IntegrityError:
            return Conversation.objects.get(coach=coach, student=student), False