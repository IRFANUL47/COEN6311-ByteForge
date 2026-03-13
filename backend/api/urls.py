from django.urls import path
from . import views

urlpatterns = [
    path("auth/register/", views.register, name="auth-register"),
    path("auth/login/", views.login, name="auth-login"),
    path("profile/update/", views.update_profile, name="profile-update"),
    path("profile/update/password/", views.update_password, name="profile-update-password"),
    path("profile/delete/", views.delete_profile, name="profile-delete"),
]