from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import WorkoutPlan, WorkoutSession
from ..serializers import WorkoutPlanSerializer, WorkoutPlanCreateUpdateSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def workoutplan_list(request):
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

    partial = request.method == "PATCH"
    serializer = WorkoutPlanCreateUpdateSerializer(
        plan, data=request.data, partial=partial, context={"request": request}
    )
    if serializer.is_valid():
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
    return Response({"detail": "Workout plan deleted."}, status=status.HTTP_204_NO_CONTENT)


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

    from django.utils import timezone
    session.status      = WorkoutSession.Status.COMPLETED
    session.completed_at = timezone.now()
    session.save()

    return Response(
        {
            "detail": "Session marked as completed.",
            "completed_at": session.completed_at,
        },
        status=status.HTTP_200_OK,
    )