from django.contrib import admin
from .models import CustomUser, Equipment, DietaryRestriction, UserDietaryRestriction, NutritionPlan

admin.site.register(CustomUser)
admin.site.register(Equipment)
admin.site.register(DietaryRestriction)
admin.site.register(UserDietaryRestriction)
admin.site.register(NutritionPlan)