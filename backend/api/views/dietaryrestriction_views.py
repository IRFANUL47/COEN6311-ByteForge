from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models import UserDietaryRestriction, DietaryRestriction
from ..serializers import UserDietaryRestrictionSerializer, DietaryRestrictionSerializer

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_dietary_restrictions(request):
    #List current student's dietary restrictions
    user = request.user
    if getattr(user, "role", None) != user.Role.STUDENT:
        return Response({"detail": "Only students can view their dietary restrictions."}, status=status.HTTP_403_FORBIDDEN)

    #`user.user_dietary_restrictions` is the related_name for UserDietaryRestriction
    restrictions = UserDietaryRestriction.objects.filter(user=user)
    serializer = UserDietaryRestrictionSerializer(restrictions, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_dietary_restriction(request):
    #Add a dietary restriction for the student (by key)
    user = request.user
    if getattr(user, "role", None) != user.Role.STUDENT:
        return Response({"detail": "Only students can add dietary restrictions."}, status=status.HTTP_403_FORBIDDEN)

    serializer = UserDietaryRestrictionSerializer(data=request.data, context={"request": request, "user": user})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_dietary_restriction(request):
    #Remove a dietary restriction for the student (by key).
    #Expected input: {"restriction_key": "<key>"}
    user = request.user
    if getattr(user, "role", None) != user.Role.STUDENT:
        return Response({"detail": "Only students can remove dietary restrictions."}, status=status.HTTP_403_FORBIDDEN)
    key = request.data.get("restriction_key")
    try:
        restriction = DietaryRestriction.objects.get(key=key)
        link = UserDietaryRestriction.objects.get(user=user, dietary_restriction=restriction)
        link.delete()
        return Response({"detail": "Restriction removed."})
    except (DietaryRestriction.DoesNotExist, UserDietaryRestriction.DoesNotExist):
        return Response({"detail": "No such restriction for user."}, status=status.HTTP_404_NOT_FOUND)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def all_dietary_restrictions(request):
    #Return the master list of all dietary restrictions
    qs = DietaryRestriction.objects.all().order_by("display_name")
    serializer = DietaryRestrictionSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dietary_restrictions_by_concordia_id(request, concordia_id):
    #Allow COACHES to view a student's dietary restrictions, by Concordia ID
    user = request.user
    if getattr(user, "role", None) != user.Role.COACH:
        return Response({"detail": "Only coaches can view students' dietary restrictions."}, status=status.HTTP_403_FORBIDDEN)
    try:
        student = CustomUser.objects.get(concordia_id=concordia_id, role=CustomUser.Role.STUDENT)
    except CustomUser.DoesNotExist:
        return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)
    restrictions = UserDietaryRestriction.objects.filter(user=student)
    serializer = UserDietaryRestrictionSerializer(restrictions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)