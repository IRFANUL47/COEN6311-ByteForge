from ..models import NutritionPlan
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..serializers import NutritionPlanSerializer, NutritionPlanCreateUpdateSerializer


def _deactivate_expired_plans():
    """
    Set is_active=False for any nutrition plan whose end_date has passed.
    Called at the start of nutritionplan_list so the list stays accurate
    without needing a background task.
    """
    today = timezone.now().date()
    NutritionPlan.objects.filter(is_active=True, end_date__lt=today).update(is_active=False)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def nutritionplan_list(request):
    _deactivate_expired_plans()

    user = request.user
    if getattr(user, "role", None) == user.Role.COACH:
        qs = NutritionPlan.objects.filter(coach=user).order_by("-created_at")
    elif getattr(user, "role", None) == user.Role.STUDENT:
        qs = NutritionPlan.objects.filter(student=user).order_by("-created_at")
    else:
        qs = NutritionPlan.objects.none()

    serializer = NutritionPlanSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def nutritionplan_create(request):
    user = request.user
    if not (getattr(user, "role", None) == user.Role.COACH):
        return Response({"detail": "Only coaches may create nutrition plans."}, status=status.HTTP_403_FORBIDDEN)

    serializer = NutritionPlanCreateUpdateSerializer(data=request.data, context={"request": request})
    if serializer.is_valid():
        # If the new plan is active, deactivate any existing active nutrition plan for that student
        student = serializer.validated_data.get("student")
        is_active = serializer.validated_data.get("is_active", True)
        if is_active and student:
            NutritionPlan.objects.filter(student=student, is_active=True).update(is_active=False)

        plan = serializer.save()
        read_serializer = NutritionPlanSerializer(plan)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def nutritionplan_detail(request, pk):
    plan = get_object_or_404(NutritionPlan, pk=pk)
    user = request.user

    if not ((getattr(user, "role", None) == user.Role.COACH and plan.coach_id == user.pk)
            or (getattr(user, "role", None) == user.Role.STUDENT and plan.student_id == user.pk)):
        return Response({"detail": "Not authorized to view this nutrition plan."}, status=status.HTTP_403_FORBIDDEN)

    serializer = NutritionPlanSerializer(plan)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def nutritionplan_update(request, pk):
    plan = get_object_or_404(NutritionPlan, pk=pk)
    user = request.user

    if not (getattr(user, "role", None) == user.Role.COACH and plan.coach_id == user.pk):
        return Response({"detail": "Only the coach who created the plan can modify it."}, status=status.HTTP_403_FORBIDDEN)

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
    serializer = NutritionPlanCreateUpdateSerializer(plan, data=request.data, partial=partial, context={"request": request})
    if serializer.is_valid():
        # If activating this plan, deactivate all other active plans for the same student
        new_active = serializer.validated_data.get("is_active", plan.is_active)
        if new_active and not plan.is_active:
            NutritionPlan.objects.filter(student=plan.student, is_active=True).exclude(pk=plan.pk).update(is_active=False)

        plan = serializer.save()
        read_serializer = NutritionPlanSerializer(plan)
        return Response(read_serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def nutritionplan_delete(request, pk):
    plan = get_object_or_404(NutritionPlan, pk=pk)
    user = request.user

    if not (getattr(user, "role", None) == user.Role.COACH and plan.coach_id == user.pk):
        return Response({"detail": "Only the coach who created the plan can delete it."}, status=status.HTTP_403_FORBIDDEN)

    plan.delete()
    return Response({"detail": "Nutrition plan deleted."}, status=status.HTTP_200_OK)