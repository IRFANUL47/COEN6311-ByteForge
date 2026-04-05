import os
import json
import urllib.request
import urllib.error

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from api.models import ChatRating,CoachStudentAssignment,WorkoutPlan,NutritionPlan,CustomUser,Equipment

STATIC_SYSTEM_PROMPT = """
You are CUFitness Assistant, a helpful chatbot for CUFitness — a gym management platform built for Concordia University students.

CUFitness is based on Concordia's real gym: Le Gym, located at Room EV-S2-206, 1455 De Maisonneuve Blvd. W., in the Engineering & Visual Arts Building on the Sir George Williams Campus.

== GYM HOURS ==
Monday to Friday: 6:30 AM --> 10:00 PM
Saturday: 8:00 AM--> 8:00 PM
Sunday: 8:00 AM --> 8:00 PM
Hours may vary on statutory holidays and Concordia closures.

== CONTACT ==
Phone: 514-848-2424, ext. 3860
Email: legym@concordia.ca

== WHAT LE GYM OFFERS ==
- Conditioning floor with Technogym equipment for strength and cardio
- Group fitness classes (in-person and online), led by certified instructors
- Drop-in recreational sports (no team commitment needed)
- Personal training with certified trainers
- Nutrition consultations with a registered dietitian

== MEMBERSHIP PRICING (CONCORDIA STUDENTS ONLY) ==
- 1 week: $38.50
- 1 month: $55.00
- 4 months: $121.00
- 12 months: $302.50
Prices do not include tax. Payments accepted by VISA and MasterCard only.
For refund requests or payment issues, contact: legym@concordia.ca

== CANCELLATION POLICY ==
- Sessions cancelled within 24 hours are withdrawn with no refund.
- Sessions rescheduled before 24 hours receive a full refund minus a $6 admin fee.

== DRESS CODE & GYM RULES ==
- You must be a registered member. Scan your barcode at the welcome desk before training.
- Only sport training clothing is allowed: T-shirt, shorts, sweatpants, or athletic warm-up gear.
- Jeans, jeans shorts, clothing with zippers or rivets, and outdoor attire are NOT permitted on the fitness floor.
- T-shirts must stay on while outside of the locker rooms.
- Athletic footwear (closed toe and heel) is required. No winter boots or sandals.
- There is NO towel service — bring your own towel.
- Water is the only drink allowed on the fitness floor. It must be in a plastic resealable container.
- No bags on the fitness floor — all bags must be stored in the locker rooms.
- No food on the fitness floor.
- Personal music must use headphones only. Speakers are not allowed.
- No photo or video inside the facility without Le Gym management permission.
- No FaceTime or video calls on the conditioning floor.
- Zero-tolerance policy for bullying, intimidation, or disrespect of any kind.
- Weights and bars cannot be leaned against walls, pillars, equipment, or mirrors.

== LOCKERS ==
- Lockers are free to use during your activity only. No overnight storage.
- You can bring your own lock or buy one at the front desk for $10.
- No loitering in locker rooms — finish changing and leave promptly.
- Wait for friends in the lobby or common area, not the locker room.

== EQUIPMENT CATEGORIES IN CUFITNESS ==
- Cardio machines
- Power Lifting equipment
- Cable Towers
- Resistance Machines
- Raw Equipment (free weights, mats, etc.)

== CUFITNESS PLATFORM — HOW TO USE IT ==
- Register: Go to the Register page, fill in your name, Concordia ID, email, password, and select your role (Student or Coach)
- Login: Use your Concordia ID and password
- Profile: After logging in, update your personal info including age, height, weight, and gender
- Equipment: View available gym equipment and its categories
- Nutrition Plans: View and manage personalized nutrition plans on the platform
- Dietary Restrictions: Add or remove your dietary restrictions so the platform can personalize your nutrition plans

== USER ROLES ==
- Student: Can use the platform to track fitness, view equipment, manage dietary restrictions, view nutrition plans, and book coaching sessions
- Coach: Must register and wait for Admin approval before their account is activated
- Admin: Manages the platform, approves coach accounts, and manages equipment

== COACH APPROVAL ==
Coaches register normally on the platform but need Admin approval before they can work. If your coach account is pending, contact legym@concordia.ca for help.

== NUTRITION PLANS ==
CUFitness offers nutrition plans users can view and manage. You can browse available plans, view details, create new plans, update or delete them. Plans are designed to support your fitness goals.

== DIETARY RESTRICTIONS ==
Users can manage dietary restrictions directly on the platform. Add restrictions (e.g. gluten-free, vegan, lactose intolerant), remove them, or view your current list. Coaches and admins can also view restrictions by student Concordia ID.

== BOOKING & CANCELLATION (COMING SOON) ==
Students can book sessions with their assigned coach through the platform. Contact Le Gym directly at legym@concordia.ca or call 514-848-2424 ext. 3860 for further help

== OUTSIDE PERSONAL TRAINERS ==
Only Concordia-employed Le Gym personal trainers are allowed to train clients inside the facility. Outside personal trainers are strictly prohibited. Le Gym trainers have priority access to any equipment for personal training clients.

== PRIVACY ==
Only the user and admins can access personal profile information like height, weight, and dietary restrictions on CUFitness.


Keep answers short, friendly, and helpful.
If a question is unrelated to fitness or CUFitness, politely redirect the user.
Never make up information you are unsure about.
If the user writes in French, respond entirely in French. Always reply in the same language the user is writing in.
If the user's question is serious, complex, or they ask to speak to a human, direct them to:
- Phone: 514-848-2424, ext. 3860
- Email: legym@concordia.ca
- In person: Room EV-S2-206, EV Building, Sir George Williams Campus
""".strip()


def build_student_context(user):
    lines = []
    lines.append("== STUDENT PERSONAL INFO ==")
    lines.append(f"Name: {user.first_name} {user.last_name}")
    lines.append(f"Username: {user.username}")
    lines.append(f"Concordia ID: {user.concordia_id}")
    lines.append(f"Age: {user.age or 'Not provided'}")
    lines.append(f"Gender: {user.gender or 'Not provided'}")
    lines.append(f"Height: {user.height or 'Not provided'} cm")
    lines.append(f"Weight: {user.weight or 'Not provided'} kg")

    restrictions = user.dietary_restrictions.all()
    if restrictions:
        lines.append("Dietary Restrictions: " + ", ".join([r.display_name for r in restrictions]))
    else:
        lines.append("Dietary Restrictions: None")

    try:
        assignment = CoachStudentAssignment.objects.get(student=user)
        coach = assignment.coach
        lines.append("== ASSIGNED COACH ==")
        lines.append(f"Name: {coach.first_name} {coach.last_name}")
        lines.append(f"Username: {coach.username}")
        lines.append(f"Email: {coach.email}")
    except CoachStudentAssignment.DoesNotExist:
        lines.append("== ASSIGNED COACH ==")
        lines.append("No coach assigned yet.")

    workout_plans = WorkoutPlan.objects.filter(student=user).prefetch_related("days__exercises")
    if workout_plans:
        lines.append("== WORKOUT PLANS ==")
        for plan in workout_plans:
            lines.append(f"Plan: {plan.title} | Goal: {plan.goal} | Active: {plan.is_active}")
            for day in plan.days.all():
                lines.append(f"  Day {day.day_number} - {day.label}:")
                for ex in day.exercises.all():
                    lines.append(f"    - {ex.name}: {ex.sets} sets x {ex.reps} reps")
    else:
        lines.append("== WORKOUT PLANS ==")
        lines.append("No workout plans assigned yet.")

    nutrition_plans = NutritionPlan.objects.filter(student=user)
    if nutrition_plans:
        lines.append("== NUTRITION PLANS ==")
        for plan in nutrition_plans:
            lines.append(f"Plan: {plan.title} | Calories: {plan.calories_target} | Protein: {plan.protein_g}g | Carbs: {plan.carbs_g}g | Fats: {plan.fats_g}g")
            if plan.notes:
                lines.append(f"  Notes: {plan.notes}")
    else:
        lines.append("== NUTRITION PLANS ==")
        lines.append("No nutrition plans assigned yet.")

    return "\n".join(lines)


def build_coach_context(user):
    lines = []
    lines.append("== COACH PERSONAL INFO ==")
    lines.append(f"Name: {user.first_name} {user.last_name}")
    lines.append(f"Username: {user.username}")
    lines.append(f"Concordia ID: {user.concordia_id}")

    assignments = CoachStudentAssignment.objects.filter(coach=user).select_related("student")
    if assignments:
        lines.append("== ASSIGNED STUDENTS ==")
        for a in assignments:
            student = a.student
            lines.append(f"Student: {student.first_name} {student.last_name} (ID: {student.concordia_id})")
            restrictions = student.dietary_restrictions.all()
            if restrictions:
                lines.append(f"  Dietary Restrictions: " + ", ".join([r.display_name for r in restrictions]))
            else:
                lines.append(f"  Dietary Restrictions: None")

            workout_plans = WorkoutPlan.objects.filter(student=student, coach=user).prefetch_related("days__exercises")
            if workout_plans:
                for plan in workout_plans:
                    lines.append(f"  Workout Plan: {plan.title} | Goal: {plan.goal} | Active: {plan.is_active}")
            else:
                lines.append(f"  Workout Plan: None assigned yet")

            nutrition_plans = NutritionPlan.objects.filter(student=student, coach=user)
            if nutrition_plans:
                for plan in nutrition_plans:
                    lines.append(f"  Nutrition Plan: {plan.title} | Calories: {plan.calories_target} | Protein: {plan.protein_g}g | Carbs: {plan.carbs_g}g | Fats: {plan.fats_g}g")
            else:
                lines.append(f"  Nutrition Plan: None assigned yet")
    else:
        lines.append("== ASSIGNED STUDENTS ==")
        lines.append("No students assigned yet.")

    return "\n".join(lines)


def build_admin_context():
    lines = []

    pending_coaches = CustomUser.objects.filter(role=CustomUser.Role.COACH, is_approved=False, is_active=True)
    lines.append("== PENDING COACH APPROVALS ==")
    if pending_coaches:
        for coach in pending_coaches:
            lines.append(f"- {coach.first_name} {coach.last_name} (Username: {coach.username}, ID: {coach.concordia_id})")
    else:
        lines.append("No pending coach approvals.")

    equipment_list = Equipment.objects.all()
    lines.append("== EQUIPMENT IN THE GYM ==")
    if equipment_list:
        for eq in equipment_list:
            lines.append(f"- {eq.name} | Category: {eq.category} | Quantity: {eq.quantity}")
    else:
        lines.append("No equipment registered yet.")

    total_students = CustomUser.objects.filter(role=CustomUser.Role.STUDENT).count()
    total_coaches = CustomUser.objects.filter(role=CustomUser.Role.COACH, is_approved=True).count()
    lines.append("== PLATFORM STATS ==")
    lines.append(f"Total Students: {total_students}")
    lines.append(f"Total Approved Coaches: {total_coaches}")

    return "\n".join(lines)


def build_dynamic_prompt(user):
    role = getattr(user, "role", None)
    context = ""

    if role == CustomUser.Role.STUDENT:
        context = build_student_context(user)
    elif role == CustomUser.Role.COACH:
        context = build_coach_context(user)
    elif role == CustomUser.Role.ADMIN:
        context = build_admin_context()

    return STATIC_SYSTEM_PROMPT + "\n\n" + context



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chat(request):
    user_message = request.data.get("message", "").strip()

    if not user_message:
        return Response(
            {"error": "Message cannot be empty."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(user_message) > 1000:
        return Response(
            {"error": "Message is too long. Please keep it under 1000 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        return Response(
            {"error": "AI service is not configured. Please contact the administrator."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    dynamic_prompt = build_dynamic_prompt(request.user)

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={api_key}"
    )

    payload = {
        "system_instruction": {
            "parts": [{"text": dynamic_prompt}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_message}],
            }
        ],
        "generationConfig": {
            "maxOutputTokens": 400,
            "temperature": 0.4,
        },
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            reply = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            return Response({"reply": reply}, status=status.HTTP_200_OK)

    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        return Response(
            {"error": f"Gemini error: {e.code} - {error_body}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception as e:
        return Response(
            {"error": f"Exception: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def rate_chat(request):
    message = request.data.get("message", "").strip()
    response = request.data.get("response", "").strip()
    rating = request.data.get("rating", "").strip()

    if not message or not response or not rating:
        return Response({"error": "message, response, and rating are required."}, status=status.HTTP_400_BAD_REQUEST)

    if rating not in ["up", "down"]:
        return Response({"error": "rating must be 'up' or 'down'."}, status=status.HTTP_400_BAD_REQUEST)

    ChatRating.objects.create(
        user=request.user,
        message=message,
        response=response,
        rating=rating,
    )

    return Response({"success": True}, status=status.HTTP_201_CREATED)