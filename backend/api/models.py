from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

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

class Profile(models.Model):
    class Role(models.TextChoices):
        STUDENT = "STUDENT", "Student"
        COACH = "COACH", "Coach"
        ADMIN = "ADMIN", "Admin"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)

    dietary_restrictions = models.ManyToManyField("DietaryRestriction", through="UserDietaryRestriction", related_name="profiles", blank=True)

    def __str__(self) -> str:
        return f"{self.user.username} ({self.get_role_display()})"

    class Meta:
        verbose_name = "Profile"
        verbose_name_plural = "Profiles"



class DietaryRestriction(models.Model):
    #Canonical List of dietary restrictions, e.g. "vegan", "gluten-free", etc.
    #The admin can manage restriction types without code changes.
    display_name = models.CharField(max_length=100, unique=True, help_text="The name of the dietary restriction as it appears to users.")
    key = models.CharField(max_length=100, unique=True , help_text= "A unique identifier for the dietary restriction, used internally. Should be lowercase and contain no spaces (e.g. 'vegan', 'gluten_free').")
    description = models.TextField(blank=True, default="")
    
    class Meta:
        ordering = ['display_name']
        verbose_name = "Dietary Restriction"
        verbose_name_plural = "Dietary Restrictions"

    def __str__(self) -> str:
        return self.display_name



class UserDietaryRestriction(models.Model):
    #Through model to associate users with dietary restrictions, allowing for additional metadata if needed in the future.
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="user_dietary_restrictions")
    dietary_restriction = models.ForeignKey(DietaryRestriction, on_delete=models.CASCADE, related_name="user_links")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('profile', 'dietary_restriction')
        indexes = [models.Index(fields=['profile', 'dietary_restriction'])]
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.profile.user.username} - {self.dietary_restriction.display_name}"

