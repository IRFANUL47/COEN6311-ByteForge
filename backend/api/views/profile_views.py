from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model

User = get_user_model()

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    data = request.data

    new_email = data.get("email", user.email)
    new_first_name = data.get("first_name", user.first_name) or user.first_name
    new_last_name = data.get("last_name", user.last_name) or user.last_name

    if new_email != user.email and User.objects.filter(email__iexact=new_email).exists():
        return Response({"detail": "This email is already in use."}, status=status.HTTP_400_BAD_REQUEST)
    if not new_first_name.strip().replace(' ', '').isalpha():
        return Response({"detail": "First name must contain letters only."}, status=status.HTTP_400_BAD_REQUEST)
    if not new_last_name.strip().replace(' ', '').isalpha():
        return Response({"detail": "Last name must contain letters only."}, status=status.HTTP_400_BAD_REQUEST)
    
    user.first_name = new_first_name
    user.last_name = new_last_name
    user.email = new_email or user.email
    user.gender = data.get("gender", user.gender) or user.gender
    user.height = float(data.get("height", user.height)) if data.get("height") else user.height
    user.weight = float(data.get("weight", user.weight)) if data.get("weight") else user.weight
    user.age = int(data.get("age", user.age)) if data.get("age") else user.age
    user.save()
    

    height = user.height
    weight = user.weight
    bmi = round(weight / ((height / 100) ** 2), 1) if height and weight else None

    return Response({
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "gender": user.gender,
        "age": user.age,
        "height": user.height,
        "weight": user.weight,
        "bmi": bmi,
    }, status=status.HTTP_200_OK)

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_password(request):
    user = request.user
    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")

    if not current_password or not new_password:
        return Response({"detail": "Both current and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
    if not user.check_password(current_password):
        return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_password(new_password, user)
    except ValidationError as e:
        return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_profile(request):
    user = request.user
    password = request.data.get("password")

    if not password:
        return Response({"detail": "Password is required to delete your account."}, status=status.HTTP_400_BAD_REQUEST)
    if not user.check_password(password):
        return Response({"detail": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)

    user.delete()
    return Response({"detail": "Account deleted."}, status=status.HTTP_204_NO_CONTENT)