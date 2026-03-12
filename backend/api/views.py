from django.shortcuts import render
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken



from .serializers import LoginSerializer, RegisterSerializer

User = get_user_model()


def _jwt_for_user(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()

    return Response(status=status.HTTP_201_CREATED,)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    concordia_id = serializer.validated_data["concordia_id"]
    password = serializer.validated_data["password"]

    user = authenticate(request, username=concordia_id, password=password)
    if user is None:
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return Response(
        {
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": user.role,
                "is_approved": user.is_approved,
            },
            "tokens": _jwt_for_user(user),
        },
        status=status.HTTP_200_OK,
    )

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    data = request.data

    new_email = data.get("email", user.email)
    if new_email != user.email and User.objects.filter(email__iexact=new_email).exists():
        return Response({"detail": "This email is already in use."}, status=status.HTTP_400_BAD_REQUEST)

    user.first_name = data.get("first_name", user.first_name)
    user.last_name = data.get("last_name", user.last_name)
    user.email = new_email
    user.save()

    return Response({
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
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