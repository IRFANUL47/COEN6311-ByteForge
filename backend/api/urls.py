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

    path("coaches/",                              views.coach_list,               name="coach-list"),
  
    path("assignments/my/",                       views.assignment_detail,         name="assignment-detail"),
    path("assignments/select/",                   views.assignment_select_coach,   name="assignment-select"),
    path("assignments/",                          views.assignment_list_admin,     name="assignment-list-admin"),
    path("assignments/<int:pk>/reassign/",        views.assignment_reassign,       name="assignment-reassign"),
  
    path("availability/",                         views.availability_list,         name="availability-list"),
    path("availability/create/",                  views.availability_create,       name="availability-create"),
    path("availability/<int:pk>/delete/",         views.availability_delete,       name="availability-delete"),
  
    path("bookings/",                             views.booking_list,              name="booking-list"),
    path("bookings/create/",                      views.booking_create,            name="booking-create"),
    path("bookings/<int:pk>/",                    views.booking_detail,            name="booking-detail"),
    path("bookings/<int:pk>/approve/",            views.booking_approve,           name="booking-approve"),
    path("bookings/<int:pk>/request-rejection/",  views.booking_request_rejection, name="booking-request-rejection"),
    path("bookings/<int:pk>/admin-approve-rejection/", views.admin_approve_rejection, name="admin-approve-rejection"),
    path("bookings/<int:pk>/admin-deny-rejection/",    views.admin_deny_rejection,    name="admin-deny-rejection"),
    path("bookings/<int:pk>/cancel/",             views.booking_cancel,            name="booking-cancel"),
  
    path("notifications/",                        views.notification_list,         name="notification-list"),
    path("notifications/unread-count/",           views.notification_unread_count, name="notification-unread-count"),
    path("notifications/<int:pk>/read/",          views.notification_mark_read,    name="notification-mark-read"),
    path("notifications/read-all/",               views.notification_mark_all_read,name="notification-read-all"),

    path("messages/", views.create_message, name="messages-create"),
    path("conversations/", views.conversations_list, name="conversations-list"),
    path("conversations/<int:conversation_id>/messages/", views.conversation_messages, name ="conversation-messages"),
    path("conversations/<int:conversation_id>/messages/read/", views.conversation_mark_read, name="conversation-mark-read"),

    path("admin/pending-users/", views.pending_users_list, name="admin-pending-users-list"),
    path("admin/pending-users/<int:user_id>/approve/", views.approve_user, name="admin-pending-user-approve"),
    path("admin/pending-users/<int:user_id>/reject/", views.reject_user, name="admin-pending-user-reject"), 
]