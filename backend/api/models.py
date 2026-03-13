from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "STUDENT", "Student"
        COACH = "COACH", "Coach"
        ADMIN = "ADMIN", "Admin"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    concordia_id = models.CharField(max_length=10, unique=True)
    is_approved = models.BooleanField(default=False)
    
    def __str__(self) -> str:
        return f"{self.username} ({self.role})"
    
class Equipment(models.Model):
    class Category(models.TextChoices):
        CARDIO = 'CARDIO', 'Cardio'
        HEAVY = 'HEAVY', 'Power Lifting'
        CABLES = 'CABLES', 'Cable Towers'
        MACHINES = 'MACHINES', 'Resistance Machines'
        RAW = 'RAW', 'Raw Equipment'

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.RAW)
    quantity = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.name} ({self.category})"
