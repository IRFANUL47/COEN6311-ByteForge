from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "STUDENT", "Student"
        COACH = "COACH", "Coach"
        ADMIN = "ADMIN", "Admin"

    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    concordia_id = models.CharField(max_length=10, unique=True)
    is_approved = models.BooleanField(default=False)
    gender = models.CharField(max_length=20, choices=Gender.choices, blank=True, null=True)
    age = models.PositiveIntegerField(blank=True, null=True)
    height = models.FloatField(blank=True, null=True)  
    weight = models.FloatField(blank=True, null=True)
    dietary_restrictions = models.ManyToManyField("DietaryRestriction", through="UserDietaryRestriction", blank=True)
    
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
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_dietary_restrictions")
    dietary_restriction = models.ForeignKey(DietaryRestriction, on_delete=models.CASCADE, related_name="user_links")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'dietary_restriction')
        indexes = [models.Index(fields=['user', 'dietary_restriction'])]
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.user.username} - {self.dietary_restriction.display_name}"


class NutritionPlan(models.Model):

    coach = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="nutrition_plans_given", help_text="Coach who created the plan",)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="nutrition_plans_received", help_text="Student who receives the plan",)

    title = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True, help_text="Free-form instructions for the student.")
    plan = models.JSONField(blank=True, null=True, help_text="Optional structured plan (meals, schedule, portions).")

    calories_target = models.PositiveIntegerField(null=True, blank=True)
    protein_g = models.PositiveIntegerField(null=True, blank=True)
    carbs_g = models.PositiveIntegerField(null=True, blank=True)
    fats_g = models.PositiveIntegerField(null=True, blank=True)

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Nutrition Plan"
        verbose_name_plural = "Nutrition Plans"
        indexes = [models.Index(fields=["coach"]), models.Index(fields=["student"]), models.Index(fields=["is_active", "start_date"]),]

    def __str__(self) -> str:
        title = f" - {self.title}" if self.title else ""
        return f"NutritionPlan: {self.student} by {self.coach}{title}"

    def clean(self):
        # ensure coach and student are different
        if self.coach_id and self.student_id and self.coach_id == self.student_id:
            raise ValidationError("Coach and student must be different users.")

        # If user objects are available, validate roles
        coach_role = getattr(self.coach, "role", None)
        student_role = getattr(self.student, "role", None)

        if coach_role is not None and coach_role != CustomUser.Role.COACH:
            raise ValidationError({"coach": "Assigned coach must have role COACH."})
        if student_role is not None and student_role != CustomUser.Role.STUDENT:
            raise ValidationError({"student": "Assigned student must have role STUDENT."})

        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "end_date must be the same or after start_date."})

    def save(self, *args, **kwargs):
        # run validation before saving
        self.full_clean()
        super().save(*args, **kwargs)

    def is_editable_by(self, user):
        if user is None:
            return False
        if getattr(user, "is_superuser", False):
            return True
        return user.pk == self.coach_id
    
    # ──────────────────────────────────────────────
# WORKOUT PLAN
# Follows the same pattern as NutritionPlan
# ──────────────────────────────────────────────
class WorkoutPlan(models.Model):
    coach = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workout_plans_given",
        help_text="Coach who created the plan",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workout_plans_received",
        help_text="Student who receives the plan",
    )

    title      = models.CharField(max_length=200, blank=True)
    goal       = models.TextField(blank=True, help_text="Overall goal of the plan, e.g. 'Build upper body strength'")
    start_date = models.DateField(null=True, blank=True)
    end_date   = models.DateField(null=True, blank=True)
    is_active  = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Workout Plan"
        verbose_name_plural = "Workout Plans"
        indexes = [
            models.Index(fields=["coach"]),
            models.Index(fields=["student"]),
            models.Index(fields=["is_active", "start_date"]),
        ]

    def __str__(self):
        title = f" - {self.title}" if self.title else ""
        return f"WorkoutPlan: {self.student} by {self.coach}{title}"

    def clean(self):
        # Coach and student must be different users
        if self.coach_id and self.student_id and self.coach_id == self.student_id:
            raise ValidationError("Coach and student must be different users.")

        # Validate roles — same pattern as NutritionPlan
        coach_role   = getattr(self.coach,   "role", None)
        student_role = getattr(self.student, "role", None)

        if coach_role is not None and coach_role != CustomUser.Role.COACH:
            raise ValidationError({"coach": "Assigned coach must have role COACH."})
        if student_role is not None and student_role != CustomUser.Role.STUDENT:
            raise ValidationError({"student": "Assigned student must have role STUDENT."})

        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "end_date must be the same or after start_date."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def is_editable_by(self, user):
        if user is None:
            return False
        if getattr(user, "is_superuser", False):
            return True
        return user.pk == self.coach_id


# ──────────────────────────────────────────────
# WORKOUT DAY
# A named day within the plan, e.g. "Day 1 - Upper Body"
# ──────────────────────────────────────────────
class WorkoutDay(models.Model):
    plan       = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE, related_name="days")
    day_number = models.PositiveIntegerField()
    label      = models.CharField(max_length=100, help_text="e.g. 'Push Day', 'Leg Day'")
    notes      = models.TextField(blank=True)

    class Meta:
        ordering = ["day_number"]
        unique_together = ("plan", "day_number")

    def __str__(self):
        return f"{self.plan.title} — Day {self.day_number}: {self.label}"


# ──────────────────────────────────────────────
# EXERCISE
# Individual exercise inside a WorkoutDay
# ──────────────────────────────────────────────
class Exercise(models.Model):
    workout_day   = models.ForeignKey(WorkoutDay, on_delete=models.CASCADE, related_name="exercises")
    name          = models.CharField(max_length=150)
    sets          = models.PositiveIntegerField(null=True, blank=True)
    reps          = models.PositiveIntegerField(null=True, blank=True)
    duration_secs = models.PositiveIntegerField(null=True, blank=True, help_text="For timed exercises, e.g. planks")
    notes         = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} — {self.sets}x{self.reps}"


# ──────────────────────────────────────────────
# WORKOUT SESSION
# Tracks a student completing a WorkoutDay (US2)
# ──────────────────────────────────────────────
class WorkoutSession(models.Model):
    class Status(models.TextChoices):
        PENDING   = "PENDING",   "Pending"
        COMPLETED = "COMPLETED", "Completed"
        MISSED    = "MISSED",    "Missed"

    student     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workout_sessions"
    )
    plan        = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE, related_name="sessions")
    workout_day = models.ForeignKey(WorkoutDay,  on_delete=models.SET_NULL, null=True, related_name="sessions")
    status       = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    scheduled_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)  # filled on "Mark as Completed"

    class Meta:
        ordering = ["scheduled_at"]

    def __str__(self):
        return f"{self.student.username} — {self.workout_day} [{self.status}]"
    
# ──────────────────────────────────────────────
# COACH STUDENT ASSIGNMENT
# Student selects a coach and is permanently assigned
# ──────────────────────────────────────────────
class CoachStudentAssignment(models.Model):
    coach   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assigned_students"
    )
    student = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assigned_coach"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-assigned_at"]

    def __str__(self):
        return f"{self.student.username} → {self.coach.username}"

    def clean(self):
        coach_role   = getattr(self.coach,   "role", None)
        student_role = getattr(self.student, "role", None)

        if coach_role is not None and coach_role != CustomUser.Role.COACH:
            raise ValidationError({"coach": "Selected user is not a coach."})
        if student_role is not None and student_role != CustomUser.Role.STUDENT:
            raise ValidationError({"student": "Selected user is not a student."})
        if self.coach_id and self.student_id and self.coach_id == self.student_id:
            raise ValidationError("Coach and student must be different users.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# ──────────────────────────────────────────────
# COACH AVAILABILITY
# Coach defines available time slots for booking
# ──────────────────────────────────────────────
class CoachAvailability(models.Model):
    coach      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="availability_slots"
    )
    start_time = models.DateTimeField()
    end_time   = models.DateTimeField()
    is_booked  = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["coach", "start_time"],
                name="unique_coach_slot"
            )
        ]

    def __str__(self):
        status = "Booked" if self.is_booked else "Available"
        return f"{self.coach.username} | {self.start_time} → {self.end_time} [{status}]"

    def clean(self):
        coach_role = getattr(self.coach, "role", None)
        if coach_role is not None and coach_role != CustomUser.Role.COACH:
            raise ValidationError({"coach": "Only coaches can define availability slots."})
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError({"end_time": "end_time must be after start_time."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# ──────────────────────────────────────────────
# BOOKING REQUEST
# Student books one of their assigned coach's slots
# ──────────────────────────────────────────────
class BookingRequest(models.Model):
    class Status(models.TextChoices):
        PENDING       = "PENDING",       "Pending"
        APPROVED      = "APPROVED",      "Approved"
        PENDING_ADMIN = "PENDING_ADMIN", "Pending Admin Review"
        REJECTED      = "REJECTED",      "Rejected"
        CANCELLED     = "CANCELLED",     "Cancelled"

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="booking_requests"
    )
    coach = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_bookings"
    )
    slot = models.OneToOneField(
        CoachAvailability,
        on_delete=models.CASCADE,
        related_name="booking"
    )
    status         = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING
    )
    rejection_note = models.TextField(
        blank=True,
        help_text="Coach fills this when requesting rejection"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["student"]),
            models.Index(fields=["coach"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.student.username} → {self.coach.username} [{self.status}]"

    def clean(self):
        if self.coach_id and self.student_id and self.coach_id == self.student_id:
            raise ValidationError("Coach and student must be different users.")

        coach_role   = getattr(self.coach,   "role", None)
        student_role = getattr(self.student, "role", None)

        if coach_role is not None and coach_role != CustomUser.Role.COACH:
            raise ValidationError({"coach": "Selected user is not a coach."})
        if student_role is not None and student_role != CustomUser.Role.STUDENT:
            raise ValidationError({"student": "Selected user is not a student."})

        # Student can only book their assigned coach
        try:
            assignment = CoachStudentAssignment.objects.get(student=self.student)
            if assignment.coach_id != self.coach_id:
                raise ValidationError({
                    "coach": "You can only book sessions with your assigned coach."
                })
        except CoachStudentAssignment.DoesNotExist:
            raise ValidationError({
                "student": "You have not been assigned a coach yet."
            })

        # Slot must belong to the selected coach
        if self.slot and self.slot.coach_id != self.coach_id:
            raise ValidationError({"slot": "This slot does not belong to your assigned coach."})

        # Slot must not already be booked
        if self.slot and self.slot.is_booked and self._state.adding:
            raise ValidationError({"slot": "This time slot is already booked."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def is_editable_by(self, user):
        if user is None:
            return False
        if getattr(user, "is_superuser", False):
            return True
        return user.pk == self.coach_id


# ──────────────────────────────────────────────
# NOTIFICATION
# In-app bell notifications for coach and student
# ──────────────────────────────────────────────
class Notification(models.Model):
    class NotificationType(models.TextChoices):
        BOOKING_REQUEST      = "BOOKING_REQUEST",      "New Booking Request"
        BOOKING_APPROVED     = "BOOKING_APPROVED",     "Booking Approved"
        BOOKING_REJECTED     = "BOOKING_REJECTED",     "Booking Rejected"
        REJECTION_APPROVED   = "REJECTION_APPROVED",   "Rejection Approved by Admin"
        REJECTION_DENIED     = "REJECTION_DENIED",     "Rejection Denied by Admin"

    recipient        = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications"
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices
    )
    message   = models.TextField()
    is_read   = models.BooleanField(default=False)
    booking   = models.ForeignKey(
        BookingRequest,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"→ {self.recipient.username} [{self.notification_type}]"

class ChatRating(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_ratings')
    message = models.TextField()
    response = models.TextField()
    rating = models.CharField(max_length=10, choices=[('up', 'Thumbs Up'), ('down', 'Thumbs Down')])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.rating} - {self.created_at}"


class Conversation(models.Model):
    coach = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversations_as_coach")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversations_as_student")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("coach", "student")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Conversation: {self.student.username} ⇄ {self.coach.username}"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender.username}: {self.content[:40]}"
