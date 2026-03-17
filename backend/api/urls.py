from django.urls import path
from . import views

urlpatterns = [
    path("auth/register/", views.register, name="auth-register"),
    path("auth/login/", views.login, name="auth-login"),
    
    path("profile/update/", views.update_profile, name="profile-update"),
    path("profile/update/password/", views.update_password, name="profile-update-password"),
    path("profile/delete/", views.delete_profile, name="profile-delete"),

    path('equipment/', views.equipment_list, name='equipment-list'),
    path('equipment/create/', views.equipment_create, name='equipment-create'),
    path('equipment/<int:pk>/update/', views.equipment_update, name='equipment-update'),
    path('equipment/<int:pk>/delete/', views.equipment_delete, name='equipment-delete'),

    path("nutrition-plans/", views.nutritionplan_list, name="nutritionplan-list"),
    path("nutrition-plans/create/", views.nutritionplan_create, name="nutritionplan-create"),
    path("nutrition-plans/<int:pk>/", views.nutritionplan_detail, name="nutritionplan-detail"),
    path("nutrition-plans/<int:pk>/update/", views.nutritionplan_update, name="nutritionplan-update"),
    path("nutrition-plans/<int:pk>/delete/", views.nutritionplan_delete, name="nutritionplan-delete"),

    path("dietary-restrictions/", views.my_dietary_restrictions, name="my_dietary_restrictions"),
    path("dietary-restrictions/add/", views.add_dietary_restriction, name="add_dietary_restriction"),
    path("dietary-restrictions/remove/", views.remove_dietary_restriction, name="remove_dietary_restriction"),
]