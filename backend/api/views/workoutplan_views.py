from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from ..models import WorkoutPlan, WorkoutSession
from ..serializers import WorkoutPlanSerializer, WorkoutPlanCreateUpdateSerializer


def _deactivate_expired_workout_plans():
    """
    Set is_active=False for any workout plan whose end_date has passed.
    Called at the start of workoutplan_list so the list stays accurate
    without needing a background task.
    """
    today = timezone.now().date()
    WorkoutPlan.objects.filter(is_active=True, end_date__lt=today).update(is_active=False)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def workoutplan_list(request):
    _deactivate_expired_workout_plans()

    user = request.user
    if getattr(user, "role", None) == user.Role.COACH:
        qs = WorkoutPlan.objects.filter(coach=user).order_by("-created_at")
    elif getattr(user, "role", None) == user.Role.STUDENT:
        qs = WorkoutPlan.objects.filter(student=user).order_by("-created_at")
    else:
        qs = WorkoutPlan.objects.none()

    serializer = WorkoutPlanSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def workoutplan_create(request):
    user = request.user
    if not (getattr(user, "role", None) == user.Role.COACH):
        return Response(
            {"detail": "Only coaches may create workout plans."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = WorkoutPlanCreateUpdateSerializer(
        data=request.data, context={"request": request}
    )
    if serializer.is_valid():
        # If the new plan is active, deactivate any existing active workout plan for that student
        student = serializer.validated_data.get("student")
        is_active = serializer.validated_data.get("is_active", True)
        if is_active and student:
            WorkoutPlan.objects.filter(student=student, is_active=True).update(is_active=False)

        plan = serializer.save()
        read_serializer = WorkoutPlanSerializer(plan)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def workoutplan_detail(request, pk):
    plan = get_object_or_404(WorkoutPlan, pk=pk)
    user = request.user

    is_coach   = getattr(user, "role", None) == user.Role.COACH   and plan.coach_id   == user.pk
    is_student = getattr(user, "role", None) == user.Role.STUDENT and plan.student_id == user.pk

    if not (is_coach or is_student):
        return Response(
            {"detail": "Not authorized to view this workout plan."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = WorkoutPlanSerializer(plan)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def workoutplan_update(request, pk):
    plan = get_object_or_404(WorkoutPlan, pk=pk)
    user = request.user

    if not (getattr(user, "role", None) == user.Role.COACH and plan.coach_id == user.pk):
        return Response(
            {"detail": "Only the coach who created the plan can modify it."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Prevent re-activating a plan whose end_date has already passed
    today = timezone.now().date()
    incoming_active = request.data.get("is_active")
    if incoming_active is True or incoming_active == "true":
        end_date = request.data.get("end_date") or plan.end_date
        if end_date and str(end_date) < str(today):
            return Response(
                {"detail": "Cannot activate a plan whose end date has already passed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    partial = request.method == "PATCH"
    serializer = WorkoutPlanCreateUpdateSerializer(
        plan, data=request.data, partial=partial, context={"request": request}
    )
    if serializer.is_valid():
        # If activating this plan, deactivate all other active plans for the same student
        new_active = serializer.validated_data.get("is_active", plan.is_active)
        if new_active and not plan.is_active:
            WorkoutPlan.objects.filter(student=plan.student, is_active=True).exclude(pk=plan.pk).update(is_active=False)

        plan = serializer.save()
        read_serializer = WorkoutPlanSerializer(plan)
        return Response(read_serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def workoutplan_delete(request, pk):
    plan = get_object_or_404(WorkoutPlan, pk=pk)
    user = request.user

    if not (getattr(user, "role", None) == user.Role.COACH and plan.coach_id == user.pk):
        return Response(
            {"detail": "Only the coach who created the plan can delete it."},
            status=status.HTTP_403_FORBIDDEN,
        )

    plan.delete()
    return Response({"detail": "Workout plan deleted."}, status=status.HTTP_200_OK)


# ── US2: Mark a session as completed ──────────────────────────────────────────
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def workoutsession_complete(request, pk):
    session = get_object_or_404(WorkoutSession, pk=pk)
    user = request.user

    # Only the student who owns the session can mark it complete
    if not (getattr(user, "role", None) == user.Role.STUDENT and session.student_id == user.pk):
        return Response(
            {"detail": "Only the assigned student can mark this session as completed."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if session.status == WorkoutSession.Status.COMPLETED:
        return Response(
            {"detail": "Session is already marked as completed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    session.status       = WorkoutSession.Status.COMPLETED
    session.completed_at = timezone.now()
    session.save()

    return Response(
        {
            "detail": "Session marked as completed.",
            "completed_at": session.completed_at,
        },
        status=status.HTTP_200_OK,
    )