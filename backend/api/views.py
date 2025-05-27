from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import api_view, permission_classes
from django.utils.timezone import now
from django.db.models import Q, Count, Max
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from fsrs import Scheduler, Rating
from .models import (
    UserPreferences, Language, Word, UserWord, WordInstance, Definition, Video,
    UserVideo, Sentence, Question, Answer
)
from .serializers import (
    UserSerializer, UserPreferencesSerializer, UserLoginSerializer, 
    UserSignupSerializer, UserWordSerializer, WordSerializer, 
    DefinitionSerializer, VideoSerializer, UserVideoSerializer,
    QuestionSerializer
)
from .utils import (
    get_common_words, create_questions, generate_feedback
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
    prefs, _ = UserPreferences.objects.get_or_create(user=request.user)
    if prefs.language == None:
        pl = Language.objects.get(abb='pl')
        prefs.language = pl
        prefs.save()

    if request.method == 'GET':
        serializer = UserPreferencesSerializer(prefs)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = UserPreferencesSerializer(prefs, data=request.data, partial=True)
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
    calculate_user_video_scores(user.id, word.language.id)
    add_definitions([word.id], 'pl')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def user_words(request):
    if request.method == 'GET':
        vocab_filter = int(request.query_params.get('vocab_filter'))
        if vocab_filter == 0: # Alphabetical Order
            user_words = UserWord.objects.filter(user=request.user).order_by('word__text')
        else: # Recently Added
            user_words = UserWord.objects.filter(user=request.user).order_by('-id')
        
        serializer = UserWordSerializer(user_words, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        word_id = request.data.get('word_id')
        try:
            word = Word.objects.get(id=word_id)
        except Word.DoesNotExist:
            return Response({"error": "Word not found"}, status=404)
        add_word(request.user, word)
        return Response({"message": "ok"}, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_words_del(request):
    word_ids = request.data.get('ids', [])

    if not isinstance(word_ids, list):
        return Response({'error': 'Invalid data format: ids must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

    # Delete UserWord entries for current user and matching word IDs
    deleted, _ = UserWord.objects.filter(user=request.user, word_id__in=word_ids).delete()

    return Response({'deleted': deleted}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_user_words(request, vocab_filter):
    if vocab_filter == 0: # Alphabetical Order
        user_words = UserWord.objects.filter(user=request.user).order_by('word__text')
    else: # Recently Added
        user_words = UserWord.objects.filter(user=request.user).order_by('-id')
    
    serializer = UserWordSerializer(user_words, many=True)
    return Response(serializer.data)

class CommonWordsPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 10

@api_view(['GET'])
@permission_classes([AllowAny])
def common_words(request):
    language = Language.objects.get(abb='pl')
    words = get_common_words(language)

    # Filter out known words only if user is authenticated
    if request.user.is_authenticated:
        user_word_ids = UserWord.objects.filter(user=request.user).values_list('word__id', flat=True)
        words = words.exclude(id__in=user_word_ids)

    paginator = CommonWordsPagination()
    result_page = paginator.paginate_queryset(words, request)
    serializer = WordSerializer(result_page, many=True)

    return paginator.get_paginated_response(serializer.data)

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

class MyVideosPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100

@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def get_videos(request):
    paginator = MyVideosPagination()

    if request.user.is_authenticated:
        prefs, _ = UserPreferences.objects.get_or_create(user=request.user)

        # Use query params if provided, else fallback to user preferences
        comprehension_min = request.query_params.get('comprehension_min')
        comprehension_max = request.query_params.get('comprehension_max')

        try:
            comprehension_min = int(comprehension_min) if comprehension_min is not None else prefs.comprehension_level_min
            comprehension_max = int(comprehension_max) if comprehension_max is not None else prefs.comprehension_level_max
        except ValueError:
            return Response({'detail': 'Invalid comprehension values.'}, status=400)

        user_videos = UserVideo.objects.filter(
            user=request.user,
            video__language=prefs.language,
            score__gte=comprehension_min,
            score__lte=comprehension_max
        ).select_related('video', 'video__channel', 'video__language').order_by('-score')

        if user_videos.exists():
            page = paginator.paginate_queryset(user_videos, request)
            serializer = UserVideoSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        # Fallback: no UserVideo rows, use default videos with score 0
        fallback_videos = Video.objects.filter(language=prefs.language)\
            .select_related('channel', 'language')\
            .order_by('-id')  # fallback ordering can be any

    else:
        # Anonymous fallback
        fallback_videos = Video.objects.select_related('channel', 'language')\
            .order_by('-id')  # fallback ordering can be any

    # Paginate fallback videos
    page = paginator.paginate_queryset(fallback_videos, request)
    serialized_page = [
        {
            'video': VideoSerializer(video).data,
            'score': 0
        } for video in page
    ]
    return paginator.get_paginated_response(serialized_page)

@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def video_words(request, video_id):
    word_count = 20
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)

    word_instances = (
        WordInstance.objects
        .filter(video=video)
        .select_related('word__root')
        .annotate(root_word_id=Coalesce('word__root_id', 'word_id'))
    )

    # Exclude known root words for authenticated users
    if request.user.is_authenticated:
        known_word_ids = (
            UserWord.objects
            .filter(user=request.user)
            .select_related('word__root')
            .annotate(root_id=Coalesce('word__root_id', 'word_id'))
            .values_list('root_id', flat=True)
        )
        word_instances = word_instances.exclude(
            word__root_id__in=known_word_ids
        ).exclude(
            word_id__in=known_word_ids
        )

    # Count frequencies of root words efficiently in the DB
    root_counts = (
        word_instances
        .values('root_word_id')
        .annotate(count=Count('id'))
        .order_by('-count')[:word_count]
    )

    root_word_ids = [entry['root_word_id'] for entry in root_counts]

    # Fetch and map words by ID
    words = Word.objects.filter(id__in=root_word_ids)
    word_map = {word.id: word for word in words}
    ordered_words = [word_map[wid] for wid in root_word_ids if wid in word_map]

    serializer = WordSerializer(ordered_words, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_questions(request, video_id):
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=404)
    
    existing_questions = Question.objects.filter(video=video).order_by('start')
    if existing_questions.exists():
        serializer = QuestionSerializer(existing_questions, many=True)
        return Response(serializer.data)
    
    questions = create_questions(video)
    serializer = QuestionSerializer(questions, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_answers(request):
    user = request.user
    data = request.data
    video_id = data['video_id']
    answers = []
    for item in data:
        question = Question.objects.get(id=item['question_id'])
        answer, _ = Answer.objects.update_or_create(
            question=question,
            user=user,
            defaults={'text': item['text']}
        )
        answers.append(answer)
    sentences = Sentence.objects.filter(video_id=video_id).order_by("start")
    total_text = " ".join(sentence.text for sentence in sentences)
    feedback_dict = generate_feedback(answers, total_text, user)
    return Response(feedback_dict)