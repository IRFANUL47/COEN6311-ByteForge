from django.contrib import admin
from .models import CustomUser, Equipment, DietaryRestriction, UserDietaryRestriction, NutritionPlan, WorkoutPlan, WorkoutDay, Exercise, CoachStudentAssignment, CoachAvailability, BookingRequest, Notification, ChatRating


admin.site.register(CustomUser)
admin.site.register(Equipment)
admin.site.register(DietaryRestriction)
admin.site.register(UserDietaryRestriction)
admin.site.register(NutritionPlan)
admin.site.register(WorkoutPlan)
admin.site.register(WorkoutDay)
admin.site.register(Exercise)
admin.site.register(CoachStudentAssignment)
admin.site.register(CoachAvailability)
admin.site.register(BookingRequest)
admin.site.register(Notification)
admin.site.register(ChatRating)