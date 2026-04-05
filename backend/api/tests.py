from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta

from api.models import BookingRequest, CoachStudentAssignment, CoachAvailability, Conversation, Message

User = get_user_model()


class MessagingConnectivityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coach = User.objects.create_user(username="coach1", password="pw", role=User.Role.COACH, concordia_id="C001", is_approved=True)
        self.student = User.objects.create_user(username="student1", password="pw", role=User.Role.STUDENT, concordia_id="S001", is_approved=True)
        self.other_student = User.objects.create_user(username="student2", password="pw", role=User.Role.STUDENT, concordia_id="S002", is_approved=True)

        # Endpoint name - ensure this matches your urls.py
        self.messages_url = reverse("messages-create")

    def test_student_can_message_assigned_coach(self):
        # create permanent assignment
        CoachStudentAssignment.objects.create(coach=self.coach, student=self.student)

        self.client.force_authenticate(self.student)
        resp = self.client.post(self.messages_url, {"recipient_id": self.coach.pk, "content": "Hi coach"})
        self.assertIn(resp.status_code, (200, 201), resp.content)

    def test_student_cannot_message_unassigned_coach(self):
        self.client.force_authenticate(self.other_student)
        resp = self.client.post(self.messages_url, {"recipient_id": self.coach.pk, "content": "Hi coach"})
        self.assertEqual(resp.status_code, 403, resp.content)

    def test_coach_can_message_student_with_approved_booking(self):
        # ensure the student is assigned to the coach (BookingRequest.clean requires this)
        CoachStudentAssignment.objects.create(coach=self.coach, student=self.student)

        # create availability slot and APPROVED booking request
        slot = CoachAvailability.objects.create(coach=self.coach, start_time=timezone.now() + timedelta(days=1), end_time=timezone.now() + timedelta(days=1, hours=1))
        BookingRequest.objects.create(coach=self.coach, student=self.student, slot=slot, status=BookingRequest.Status.APPROVED)

        self.client.force_authenticate(self.coach)
        resp = self.client.post(self.messages_url, {"recipient_id": self.student.pk, "content": "Hello student"})
        self.assertIn(resp.status_code, (200, 201), resp.content)

    def test_coach_cannot_message_student_without_approved_booking(self):
        self.client.force_authenticate(self.coach)
        resp = self.client.post(self.messages_url, {"recipient_id": self.other_student.pk, "content": "Hello student"})
        self.assertEqual(resp.status_code, 403, resp.content)

class ConversationEndpointsTests(TestCase):
    def setUp(self):
        # create users (provide unique concordia_id to satisfy unique constraint)
        self.coach = User.objects.create_user(
            username="coach1",
            password="pass",
            role=User.Role.COACH,
            first_name="Coach",
            last_name="One",
            concordia_id="C100",
        )
        self.student = User.objects.create_user(
            username="student1",
            password="pass",
            role=User.Role.STUDENT,
            first_name="Student",
            last_name="One",
            concordia_id="S100",
        )
        
        # assignment so student<->coach conversation makes sense for UI
        CoachStudentAssignment.objects.create(coach=self.coach, student=self.student)

        # create conversation and two messages (student then coach)
        self.conv = Conversation.objects.create(coach=self.coach, student=self.student)
        self.msg1 = Message.objects.create(conversation=self.conv, sender=self.student, content="Hi coach")
        self.msg2 = Message.objects.create(conversation=self.conv, sender=self.coach, content="Hello student")

        self.client = APIClient()    

    def test_conversations_list_includes_preview_and_unread_count(self):
        # authenticate as coach
        self.client.force_authenticate(self.coach)
        resp = self.client.get("/api/conversations/")
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json()
        # find our conversation in the response
        found = None
        for item in data:
            if item.get("id") == self.conv.id:
                found = item
                break
        self.assertIsNotNone(found, "conversation not present in list")
        # last_message_preview should be present and include last message content
        self.assertIn("last_message_preview", found)
        self.assertTrue(found["last_message_preview"].lower().startswith(self.msg2.content.lower()))
        # unread_count should count messages not sent by the current user (coach): msg1 is unread by coach
        self.assertIn("unread_count", found)
        self.assertEqual(int(found["unread_count"]), 1)

    def test_conversation_messages_access_and_content(self):
        # participant can fetch message history
        self.client.force_authenticate(self.student)
        resp = self.client.get(f"/api/conversations/{self.conv.id}/messages/")
        self.assertEqual(resp.status_code, 200, resp.content)
        payload = resp.json()
        # expect both messages in chronological order
        self.assertIsInstance(payload, list)
        self.assertGreaterEqual(len(payload), 2)
        self.assertEqual(payload[0]["content"], self.msg1.content)
        self.assertEqual(payload[-1]["content"], self.msg2.content)

        # non-participant cannot access
        outsider = User.objects.create_user(username="outsider", password="pass", role=User.Role.STUDENT, concordia_id="S999")
        self.client.force_authenticate(outsider)
        resp2 = self.client.get(f"/api/conversations/{self.conv.id}/messages/")
        self.assertEqual(resp2.status_code, 403)

    def test_conversation_mark_read_updates_unread_messages(self):
        # ensure messages are unread initially
        self.assertFalse(Message.objects.get(pk=self.msg1.pk).read)
        self.assertFalse(Message.objects.get(pk=self.msg2.pk).read)

        # coach marks conversation read (should mark messages not sent by coach => msg1)
        self.client.force_authenticate(self.coach)
        resp = self.client.patch(f"/api/conversations/{self.conv.id}/messages/read/")
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json()
        # API returns updated count
        self.assertIn("updated", data)
        self.assertEqual(int(data["updated"]), 1)

        # msg1 should now be read, msg2 remains (was sent by coach)
        self.assertTrue(Message.objects.get(pk=self.msg1.pk).read)
        self.assertFalse(Message.objects.get(pk=self.msg2.pk).read)