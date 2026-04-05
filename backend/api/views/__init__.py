from .auth_views import register, login
from .profile_views import update_profile, update_password, delete_profile, get_student_profile_by_concordia_id
from .equipment_views import equipment_list, equipment_create, equipment_update, equipment_delete
from .nutritionplan_views import nutritionplan_list, nutritionplan_create, nutritionplan_detail, nutritionplan_update, nutritionplan_delete
from .dietaryrestriction_views import my_dietary_restrictions, add_dietary_restriction, remove_dietary_restriction, all_dietary_restrictions, dietary_restrictions_by_concordia_id
from .workoutplan_views import (workoutplan_list, workoutplan_create, workoutplan_detail, workoutplan_update, workoutplan_delete, workoutsession_complete,)
from .chat_views import chat, rate_chat 
from .booking_views import (coach_list, assignment_select_coach, assignment_detail, assignment_list_admin, assignment_reassign, availability_list, availability_create, availability_delete, booking_list, booking_create, booking_detail, booking_approve, booking_request_rejection, admin_approve_rejection, admin_deny_rejection, booking_cancel, notification_list, notification_unread_count, notification_mark_read, notification_mark_all_read,)
from  .message_views import create_message, conversations_list, conversation_messages, conversation_mark_read
