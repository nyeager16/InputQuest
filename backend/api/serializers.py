from django.contrib.auth.models import User
from .models import (
    UserPreferences, Language, Word, UserWord, Definition
)
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class UserPreferencesSerializer(serializers.ModelSerializer):
    language = serializers.PrimaryKeyRelatedField(
        queryset=Language.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = UserPreferences
        fields = [
            'language',
            'comprehension_level_min',
            'comprehension_level_max',
            'queue_CI',
            'desired_retention',
            'fsrs',
            'vocab_filter',
            'max_clip_length',
        ]

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    token = serializers.SerializerMethodField()

    def validate(self, data):
        user = authenticate(
            username=data.get('username'),
            password=data.get('password')
        )
        if not user:
            raise serializers.ValidationError("Invalid username or password")
        data['user'] = user
        return data

    def get_token(self, obj):
        user = obj['user']
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

class UserSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    token = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'token')
        extra_kwargs = {'email': {'required': True}}

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Passwords do not match.")
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError("Email is already in use.")
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError("Username is already in use.")
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user

    def get_token(self, user):
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

class WordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Word
        fields = ['id', 'text']

class UserWordSerializer(serializers.ModelSerializer):
    word = WordSerializer()

    class Meta:
        model = UserWord
        fields = ['id', 'word', 'needs_review', 'data']

class DefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Definition
        fields = ['id', 'text', 'word', 'user']
        read_only_fields = ['id', 'word', 'user']