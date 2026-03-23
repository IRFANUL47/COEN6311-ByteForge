from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import CustomUser, DietaryRestriction, UserDietaryRestriction, NutritionPlan

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
        request = self.context.get("request")
        user = self.context.get("user") or (request.user if request is not None else None)
        restriction_key = validated_data.get("restriction_key")

        if user is None or not restriction_key:
            raise serializers.ValidationError("Both 'restriction_key' and authenticated 'user' are required.")

        try:
            restriction = DietaryRestriction.objects.get(key=restriction_key)
        except DietaryRestriction.DoesNotExist:
            raise serializers.ValidationError({"restriction_key": "Invalid dietary restriction key."})

        rel, created = UserDietaryRestriction.objects.get_or_create(user=user, dietary_restriction=restriction)
        return rel


class NutritionPlanSerializer(serializers.ModelSerializer):
    coach = serializers.SerializerMethodField(read_only=True)
    student = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = NutritionPlan
        fields = (
            "id",
            "title",
            "notes",
            "plan",
            "calories_target",
            "protein_g",
            "carbs_g",
            "fats_g",
            "start_date",
            "end_date",
            "is_active",
            "coach",
            "student",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("coach", "created_at", "updated_at")

    def get_coach(self, obj):
        if obj.coach is None:
            return None
        return {
            "id": obj.coach.id,
            "name": f"{obj.coach.first_name} {obj.coach.last_name}".strip(),
            "concordia_id": getattr(obj.coach, "concordia_id", None),
        }

    def get_student(self, obj):
        if obj.student is None:
            return None
        return {
            "id": obj.student.id,
            "name": f"{obj.student.first_name} {obj.student.last_name}".strip(),
            "concordia_id": getattr(obj.student, "concordia_id", None),
        }


class NutritionPlanCreateUpdateSerializer(serializers.ModelSerializer):

    student = serializers.PrimaryKeyRelatedField(queryset=User.objects.none())

    class Meta:
        model = NutritionPlan
        fields = (
            "id",
            "title",
            "notes",
            "plan",
            "calories_target",
            "protein_g",
            "carbs_g",
            "fats_g",
            "start_date",
            "end_date",
            "is_active",
            "student",
        )
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # populate queryset now (models are ready)
        try:
            self.fields["student"].queryset = User.objects.filter(role=User.Role.STUDENT)
        except Exception:
            # fallback to all users if filter fails for any reason
            self.fields["student"].queryset = User.objects.all()

    def validate(self, attrs):
        request = self.context.get("request")
        if request is None:
            return attrs

        user = request.user
        # Only coaches can create/update plans
        if not (getattr(user, "role", None) == User.Role.COACH):
            raise serializers.ValidationError("Only coaches or admins may create or update nutrition plans.")

        student = attrs.get("student")
        if student and getattr(student, "role", None) != User.Role.STUDENT:
            raise serializers.ValidationError({"student": "The selected user is not a student."})

        start = attrs.get("start_date")
        end = attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "end_date must be the same or after start_date."})

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        coach = request.user if request else None
        instance = NutritionPlan.objects.create(coach=coach, **validated_data)
        return instance

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)