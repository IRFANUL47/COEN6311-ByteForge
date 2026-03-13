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
]