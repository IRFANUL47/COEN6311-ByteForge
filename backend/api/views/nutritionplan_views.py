from ..models import NutritionPlan
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from ..serializers import NutritionPlanSerializer, NutritionPlanCreateUpdateSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def nutritionplan_list(request):
    user = request.user
    if getattr(user, "is_superuser", False):
        qs = NutritionPlan.objects.all().order_by("-created_at")
    elif getattr(user, "role", None) == user.Role.COACH:
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
    if not (getattr(user, "is_superuser", False) or getattr(user, "role", None) == user.Role.COACH):
        return Response({"detail": "Only coaches or admins may create nutrition plans."}, status=status.HTTP_403_FORBIDDEN)

    serializer = NutritionPlanCreateUpdateSerializer(data=request.data, context={"request": request})
    if serializer.is_valid():
        plan = serializer.save()
        read_serializer = NutritionPlanSerializer(plan)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def nutritionplan_detail(request, pk):
    plan = get_object_or_404(NutritionPlan, pk=pk)
    user = request.user

    if not (getattr(user, "is_superuser", False)
            or (getattr(user, "role", None) == user.Role.COACH and plan.coach_id == user.pk)
            or (getattr(user, "role", None) == user.Role.STUDENT and plan.student_id == user.pk)):
        return Response({"detail": "Not authorized to view this nutrition plan."}, status=status.HTTP_403_FORBIDDEN)

    serializer = NutritionPlanSerializer(plan)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def nutritionplan_update(request, pk):
    plan = get_object_or_404(NutritionPlan, pk=pk)
    user = request.user

    if not (getattr(user, "is_superuser", False) or (getattr(user, "role", None) == user.Role.COACH and plan.coach_id == user.pk)):
        return Response({"detail": "Only the coach who created the plan or an admin can modify it."}, status=status.HTTP_403_FORBIDDEN)

    partial = request.method == "PATCH"
    serializer = NutritionPlanCreateUpdateSerializer(plan, data=request.data, partial=partial, context={"request": request})
    if serializer.is_valid():
        plan = serializer.save()
        read_serializer = NutritionPlanSerializer(plan)
        return Response(read_serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def nutritionplan_delete(request, pk):
    plan = get_object_or_404(NutritionPlan, pk=pk)
    user = request.user

    if not (getattr(user, "is_superuser", False) or (getattr(user, "role", None) == user.Role.COACH and plan.coach_id == user.pk)):
        return Response({"detail": "Only the coach who created the plan or an admin can delete it."}, status=status.HTTP_403_FORBIDDEN)

    plan.delete()
    return Response({"detail": "Nutrition plan deleted."}, status=status.HTTP_204_NO_CONTENT)