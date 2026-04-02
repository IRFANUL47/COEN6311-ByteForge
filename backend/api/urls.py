from django.urls import path
from . import views

urlpatterns = [
    path("auth/register/", views.register, name="auth-register"),
    path("auth/login/", views.login, name="auth-login"),
    
    path("profile/update/", views.update_profile, name="profile-update"),
    path("profile/update/password/", views.update_password, name="profile-update-password"),
    path("profile/delete/", views.delete_profile, name="profile-delete"),
    path("profile/<str:concordia_id>/", views.get_student_profile_by_concordia_id, name="profile-info"),

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
    path("dietary-restrictions/all/", views.all_dietary_restrictions, name="all_dietary_restrictions"),
    path("dietary-restrictions/<str:concordia_id>/", views.dietary_restrictions_by_concordia_id, name="dietary_restrictions_by_concordia_id"),
    
    path("workout-plans/", views.workoutplan_list, name="workoutplan-list"),
    path("workout-plans/create/", views.workoutplan_create, name="workoutplan-create"),
    path("workout-plans/<int:pk>/", views.workoutplan_detail, name="workoutplan-detail"),
    path("workout-plans/<int:pk>/update/", views.workoutplan_update, name="workoutplan-update"),
    path("workout-plans/<int:pk>/delete/", views.workoutplan_delete, name="workoutplan-delete"),
    path("workout-sessions/<int:pk>/complete/", views.workoutsession_complete, name="workoutsession-complete"),
    path("chat/", views.chat, name="chat"),
    path("chat/rate/", views.rate_chat, name="chat-rate"),
]