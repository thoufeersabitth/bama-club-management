from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    branch_name = serializers.SerializerMethodField()
    branch_id = serializers.SerializerMethodField()
    is_super_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'email', 'first_name', 'last_name', 'role', 'phone', 'whatsapp', 'assigned_branch_id', 'branch_id', 'branch_name', 'is_super_admin', 'is_active']
        read_only_fields = ['id']

    def get_branch_name(self, obj):
        b = obj.assigned_branch
        return b.name if b else None

    def get_branch_id(self, obj):
        b = obj.assigned_branch
        return str(b.id) if b else obj.assigned_branch_id

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data

