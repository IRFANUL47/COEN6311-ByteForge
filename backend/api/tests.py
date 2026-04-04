from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta

from api.models import BookingRequest, CoachStudentAssignment, CoachAvailability

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