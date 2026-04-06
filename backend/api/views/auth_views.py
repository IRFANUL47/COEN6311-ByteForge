from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from ..serializers import LoginSerializer, RegisterSerializer

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

    # Check user exists and password is correct first, before calling authenticate().
    # authenticate() returns None for inactive users (is_active=False) with no way
    # to distinguish wrong password from pending approval — so we check manually.
    try:
        user_obj = User.objects.get(concordia_id=concordia_id)
    except User.DoesNotExist:
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user_obj.check_password(password):
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Admins bypass the approval gate entirely.
    # Students and coaches must be approved before they can log in.
    if user_obj.role != User.Role.ADMIN and not user_obj.is_approved:
        return Response(
            {"detail": "Your account is pending approval by an administrator. You will receive an email once it has been reviewed."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Fully authenticate via Django (handles is_active and any auth backends)
    user = authenticate(request, username=concordia_id, password=password)
    if user is None:
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    height = float(user.height) if user.height else None
    weight = float(user.weight) if user.weight else None
    bmi = round(weight / ((height / 100) ** 2), 1) if height and weight else None

    return Response(
        {
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": user.role,
                "is_approved": user.is_approved,
                "gender": user.gender,
                "age": user.age,
                "height": user.height,
                "weight": user.weight,
                "bmi": bmi,
            },
            "tokens": _jwt_for_user(user),
        },
        status=status.HTTP_200_OK,
    )