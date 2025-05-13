from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from django.utils.timezone import now
from django.db.models import Q, Prefetch
from django.shortcuts import get_object_or_404
from fsrs import Scheduler, Rating
from .models import (
    UserPreferences, Language, Word, UserWord, WordInstance, Definition
)
from .serializers import (
    UserSerializer, UserPreferencesSerializer, UserLoginSerializer, UserSignupSerializer,
    UserWordSerializer, WordSerializer, DefinitionSerializer
)
from .utils import (
    get_common_words
)
from .tasks import (
    add_definitions, calculate_user_video_scores
)

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

def add_word(user, word):
    user_word = UserWord(user=user, word=word)
    user_word.save()
    calculate_user_video_scores(user.id)
    add_definitions([word.id], 'pl')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_user_words(request, id):
    if request.method == 'POST':
        try:
            word = Word.objects.get(id=id)
        except Word.DoesNotExist:
            return Response({"error": "Word not found"}, status=404)
        add_word(request.user, word)
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_reviews(request):
    user = request.user

    user_reviews = UserWord.objects.filter(
        user=user,
        needs_review=True,
        data__due__lte=now().isoformat()
    )

    if not user_reviews.exists():
        return Response({'words': []})

    words_data = list(user_reviews.values('id', 'word_id', 'word__text'))

    # Collect word_ids for filtering definitions
    word_ids = [word['word_id'] for word in words_data]

    # Query user-specific and fallback definitions
    definition_queryset = Definition.objects.filter(
        Q(user=user) | Q(user=None),
        word_id__in=word_ids
    )

    # Pick one definition per word, preferring user-specific
    definitions_dict = {}
    for definition in definition_queryset:
        # Only override if there's no user-specific one already stored
        if definition.word_id not in definitions_dict or definition.user == user:
            definitions_dict[definition.word_id] = definition.text

    # Add definition to each word
    for word in words_data:
        word['definition'] = definitions_dict.get(word['word_id'], "")

    return Response({'words': words_data})

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def submit_review(request, id, rating):
    if request.method == 'PATCH':
        user = request.user
        user_word = get_object_or_404(UserWord, id=id, user=user)
        if rating == 0:
            fsrs_rating = Rating.Again
        else:
            fsrs_rating = Rating.Good
        """
        Handles the submission of the user's review for a word.
        Rating is passed in (from 0 to 1) and used to update the review schedule.
        """
        user_preferences = UserPreferences.objects.get(user=user)
        desired_retention = user_preferences.desired_retention

        scheduler = Scheduler(desired_retention=desired_retention)
        card = user_word.load_card()
        card, _ = scheduler.review_card(card, fsrs_rating)
        user_word.save_card(card)

        return Response({'status': 'success'})

@api_view(['GET', 'PATCH'])
@permission_classes([AllowAny])
def definitions(request, word_id):
    try:
        word = Word.objects.get(id=word_id)
    except Word.DoesNotExist:
        return Response({"error": "Word not found."}, status=status.HTTP_404_NOT_FOUND)

    user = request.user if request.user.is_authenticated else None

    # Prefer user's definition
    definition = Definition.objects.filter(user=user, word=word).first()

    # If user's doesn't exist, fall back to global definition
    if not definition:
        definition = Definition.objects.filter(user=None, word=word).first()

    if request.method == 'GET':
        if not definition:
            return Response({"text": ""})
        serializer = DefinitionSerializer(definition)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required."}, status=status.HTTP_403_FORBIDDEN)

        # Ensure there's a user-owned Definition object
        definition, _ = Definition.objects.get_or_create(user=request.user, word=word)
        serializer = DefinitionSerializer(definition, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)