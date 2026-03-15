from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import CustomUser, Profile, DietaryRestriction, UserDietaryRestriction

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


class DietaryRestrictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietaryRestriction
        fields = ["display_name", "key", "description"]


class UserDietaryRestrictionSerializer(serializers.ModelSerializer):
    #read the nested restriction for responses and accepta write-only key for creating.
    dietary_restriction = DietaryRestrictionSerializer(read_only=True)
    restriction_key = serializers.CharField(write_only=True, required=False)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = UserDietaryRestriction
        fields = ["dietary_restriction", "restriction_key", "created_at"]

    def create(self, validated_data):

        profile = self.context.get("profile")
        restriction_key = validated_data.get("restriction_key")

        if not restriction_key or profile is None:
            raise serializers.ValidationError("Both 'restriction_key' and 'profile' context are required.")

        try:
            restriction = DietaryRestriction.objects.get(key=restriction_key)
        except DietaryRestriction.DoesNotExist:
            raise serializers.ValidationError({"restriction_key": "Invalid dietary restriction key."})

        rel, created = UserDietaryRestriction.objects.get_or_create(profile=profile, dietary_restriction=restriction)
        return rel


class ProfileSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField(read_only=True)
    user_dietary_restrictions = UserDietaryRestrictionSerializer(many=True, read_only=True)
    dietary_restrictions_keys = serializers.ListField(child=serializers.CharField(), write_only=True, required=False,
    help_text="List of restriction keys to replace the current set")

    class Meta:
        model = Profile
        fields = ("user", "role", "user_dietary_restrictions", "dietary_restrictions_keys")
        read_only_fields = ("user", "user_dietary_restrictions")
    
    def get_user(self, obj):
        return {"id": obj.user.id, "email": obj.user.email, "name": obj.user.first_name}
    
    def update(self, instance, validated_data):
        keys = validated_data.pop("dietary_restrictions_keys", None)
        instance = super().update(instance, validated_data)
        if keys is not None:
            allowed = list(DietaryRestriction.objects.filter(key__in=keys))
            found_keys = {r.key for r in allowed}
            missing_keys = set(keys) - found_keys
            if missing_keys:
                raise serializers.ValidationError({"dietary_restrictions_keys": f"Invalid keys: {', '.join(missing_keys)}"})

            instance.user_dietary_restrictions.all().delete()
            for restriction in allowed:
                UserDietaryRestriction.objects.create(profile=instance, dietary_restriction=restriction)
        return instance