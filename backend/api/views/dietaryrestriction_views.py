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
        return Response({"detail": "Only students can view their dietary restrictions."}, status=403)

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
        return Response({"detail": "Only students can add dietary restrictions."}, status=403)

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
        return Response({"detail": "Only students can remove dietary restrictions."}, status=403)
    key = request.data.get("restriction_key")
    try:
        restriction = DietaryRestriction.objects.get(key=key)
        link = UserDietaryRestriction.objects.get(user=user, dietary_restriction=restriction)
        link.delete()
        return Response({"detail": "Restriction removed."})
    except (DietaryRestriction.DoesNotExist, UserDietaryRestriction.DoesNotExist):
        return Response({"detail": "No such restriction for user."}, status=404)