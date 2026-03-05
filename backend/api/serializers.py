from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import CustomUser

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=CustomUser.Role.choices)
    concordia_id = serializers.CharField(min_length=6, max_length=10)
    
    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def validate_concordia_id(self, value: str) -> str:
        if not value.isdigit():
            raise serializers.ValidationError("Concordia ID must contain numbers only.")
        if User.objects.filter(concordia_id=value).exists():
            raise serializers.ValidationError("A user with this Concordia ID already exists.")
        return value

    def create(self, validated_data):
        first_name = validated_data["first_name"].strip()
        last_name = validated_data["last_name"].strip()
        email = validated_data["email"].lower().strip()
        password = validated_data["password"]
        role = validated_data["role"]
        concordia_id = validated_data["concordia_id"]
        
        user = User.objects.create_user(
            username=concordia_id,      
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password,
            role=role,
            concordia_id=concordia_id,
        )
        return user


class LoginSerializer(serializers.Serializer):
    concordia_id = serializers.CharField()
    password = serializers.CharField(write_only=True)