from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "STUDENT", "Student"
        COACH = "COACH", "Coach"
        ADMIN = "ADMIN", "Admin"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    concordia_id = models.CharField(max_length=10, unique=True)
    
    def __str__(self) -> str:
        return f"{self.username} ({self.role})"