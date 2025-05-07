from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from .models import (
    UserPreferences, Language, Word, UserWord, WordInstance
)
from .serializers import (
    UserSerializer, UserPreferencesSerializer, UserLoginSerializer, UserSignupSerializer,
    UserWordSerializer, WordSerializer
)
from .utils import (
    get_common_words
)

@api_view(['GET'])
@permission_classes([AllowAny])
def hello_world(request):
    return Response({"message": "Hello from Django!"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_preferences(request):
    prefs, created = UserPreferences.objects.get_or_create(user=request.user)
    if prefs.language == None:
        pl = Language.objects.get(abb='pl')
        prefs.language = pl
        prefs.save()

    if request.method == 'GET':
        serializer = UserPreferencesSerializer(prefs)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = UserPreferencesSerializer(prefs, data=request.data, partial=True)
        print(serializer)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'success'})
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        tokens = serializer.get_token(serializer.validated_data)
        return Response({
            'username': serializer.validated_data['user'].username,
            'email': serializer.validated_data['user'].email,
            'token': tokens,
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def user_signup(request):
    serializer = UserSignupSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_user_words(request, id):
    if request.method == 'POST':
        try:
            word = Word.objects.get(id=id)
        except Word.DoesNotExist:
            return Response({"error": "Word not found"}, status=404)
        user_word = UserWord(user=request.user, word=word)
        user_word.save()
        return Response(status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_user_words(request):
    user_words = UserWord.objects.filter(user=request.user)
    serializer = UserWordSerializer(user_words, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_user_word_ids(request):
    user_word_ids = UserWord.objects.filter(user=request.user).values_list('word__id', flat=True)
    return Response(user_word_ids, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def common_words(request, count):
    language = Language.objects.get(abb='pl')
    words = get_common_words(language)[:count]
    serializer = WordSerializer(words, many=True)
    return Response(serializer.data)