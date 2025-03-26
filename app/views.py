from collections import defaultdict
from random import sample
from fsrs import Scheduler, Rating
import json
import os
import torch
from django.views import View
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils.timezone import now
from django.db import models
from django.db.models import Case, When, Count, F, Q, Prefetch
from .nn_srs.models.review_lstm import ReviewLSTM
from .models import (
    Video, Sentence, Channel, WatchHistory, WordInstance, Word, UserWord, 
    UserPreferences, Definition, Question, User, Review, Answer
)
from .forms import SignUpForm
from .tasks import calculate_video_CI, add_definitions
from .utils import (
    setup_user, get_video_data, get_CI_video_sections, add_words, 
    get_common_words, get_conjugation_table, remove_words, 
    generate_question, generate_feedback, group_sentences, 
    get_optimal_review_time
)

def all_videos(request):
    # Check if the user is authenticated
    user = request.user if request.user.is_authenticated else None
    selected_language = None
    comprehension_level_min = 0
    comprehension_level_max = 100
    message = "Log in to use this feature"
    if user: message = "Apply Filter"
    
    # Get user preferences if the user is authenticated
    if user:
        user_preferences = UserPreferences.objects.filter(user=user).first()
        if user_preferences:
            selected_language = user_preferences.language
            comprehension_level_min = user_preferences.comprehension_level_min
            comprehension_level_max = user_preferences.comprehension_level_max
    
    # Filter videos based on the language selection
    if selected_language:
        videos = Video.objects.filter(
            language=selected_language,
            uservideo__user=user
        ).annotate(
            user_percentage=F('uservideo__percentage')
        ).order_by('-user_percentage')
    else:
        videos = Video.objects.all()

    # Handle pagination for AJAX requests
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        page = int(request.GET.get('page', 1))
        videos_per_page = 10
        start_index = (page - 1) * videos_per_page
        end_index = start_index + videos_per_page
        videos_to_return = videos[start_index:end_index]
        has_next = end_index < videos.count()  # Check if there are more videos

        video_data = get_video_data(videos_to_return, user, comprehension_level_min, comprehension_level_max)
        
        return JsonResponse({'videos': video_data, 'has_next': has_next})

    # For regular requests (non-AJAX), return the first 10 videos
    video_data = get_video_data(videos[:10], user, comprehension_level_min, comprehension_level_max)

    # Render the full template with video data
    return render(request, 'all_videos.html', {
        'videos': video_data,
        'selected_language': selected_language,
        'min_comprehension': comprehension_level_min,
        'max_comprehension': comprehension_level_max,
        'message': message,
    })

class VideoDetailView(View):
    def get(self, request, pk):
        video = get_object_or_404(Video, pk=pk)
        word_limit = 20

        # Annotate words with root word information and count occurrences
        common_words = (
            WordInstance.objects
            .filter(video=video)
            .annotate(
                root_word=Case(
                    When(word__root__isnull=True, then=F('word__word_text')),
                    default=F('word__root__word_text'),
                    output_field=models.CharField()
                ),
                root_word_id=Case(
                    When(word__root__isnull=True, then=F('word__id')),
                    default=F('word__root__id'),
                    output_field=models.IntegerField()
                ),
            )
            .values('root_word', 'root_word_id')
            .annotate(word_count=Count('id'))
            .order_by('-word_count')
        )

        # Fetch known words if the user is authenticated
        known_words = set()
        if request.user.is_authenticated:
            known_words = set(UserWord.objects.filter(user=request.user).values_list('word__word_text', flat=True))

        # Exclude known words and limit results
        new_words = list(common_words.exclude(root_word__in=known_words)[:word_limit])

        # Retrieve all child words
        root_word_ids = [word['root_word_id'] for word in new_words]

        child_words_mapping = defaultdict(set)

        if root_word_ids:
            child_words = (
                WordInstance.objects
                .filter(video=video)
                .filter(Q(word__root__id__in=root_word_ids) | Q(word__id__in=root_word_ids))
                .values_list('word__root__id', 'word__word_text')
            )

            for root_id, word_text in child_words:
                child_words_mapping[root_id].add(word_text)

        # Convert sets to lists
        child_words_mapping = {root: list(children) for root, children in child_words_mapping.items()}

        return render(request, 'video_detail.html', {
            'video': video,
            'new_words': new_words,
            'child_words_mapping': child_words_mapping,
        })
    def post(self, request, pk):
        if request.user.is_authenticated:
            user = request.user
            word_id = int(request.POST.get('word_id'))
            if word_id == '':
                return redirect('video_detail', pk=pk)
            add_words(user, [word_id])
            calculate_video_CI(user.id)

        return redirect('video_detail', pk=pk)

def channel_detail(request, pk):
    channel = get_object_or_404(Channel, pk=pk)
    channel_url = channel.channel_url

    word_limit = 20

    # Annotate common words with root word information and count occurrences
    common_words = (
        WordInstance.objects
        .filter(video__channel__id=pk)
        .annotate(
            root_word=Case(
                When(word__root__isnull=True, then=F('word__word_text')),
                default=F('word__root__word_text'),
                output_field=models.CharField()
            ),
            root_word_id=Case(
                When(word__root__isnull=True, then=F('word__id')),
                default=F('word__root__id'),
                output_field=models.IntegerField()
            ),
        )
        .values('root_word', 'root_word_id')
        .annotate(word_count=Count('id'))
        .order_by('-word_count')
    )

    # Get known words only if the user is logged in
    known_words = set()
    if request.user.is_authenticated:
        known_words = set(UserWord.objects.filter(user=request.user).values_list('word__word_text', flat=True))

    # Filter new words that the user does not already know and limit the results
    new_words = list(common_words.exclude(root_word__in=known_words)[:word_limit])

    # Fetch all child words in a single query
    root_word_ids = [word['root_word_id'] for word in new_words]
    
    child_words_mapping = defaultdict(set)
    
    if root_word_ids:
        child_words = (
            WordInstance.objects
            .filter(video__channel__id=pk)
            .filter(Q(word__root__id__in=root_word_ids) | Q(word__id__in=root_word_ids))
            .values_list('word__root__id', 'word__word_text')
        )
        
        for root_id, word_text in child_words:
            child_words_mapping[root_id].add(word_text)

    # Convert sets back to lists
    child_words_mapping = {root: list(children) for root, children in child_words_mapping.items()}

    return render(request, 'channel.html', {
        'channel_url': channel_url,
        'new_words': new_words,
        'child_words_mapping': child_words_mapping,
    })

@login_required(login_url="/login/")
def watch(request):
    if request.user.is_authenticated:
        user = request.user
        user_preferences = UserPreferences.objects.get(user=user)
        percentage = user_preferences.queue_CI
        max_clip_length = user_preferences.max_clip_length
    return render(request, 'watch.html', {'percentage': percentage, 'max_clip_length': max_clip_length})

@login_required(login_url="/login/")
def watch_queue(request):
    user = request.user

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'watched':
            id = request.POST.get('video_id')
            
            watch_history = WatchHistory(user=user, video=Video.objects.get(id=id), completed=True)
            watch_history.save()

        elif action == 'next':
            id = request.POST.get('video_id')
            start = request.POST.get('start')
            end = request.POST.get('end')

            watch_history = WatchHistory(user=user, video=Video.objects.get(id=id), start=start, end=end)
            watch_history.save()

        return redirect(request.path_info)

    user_preferences = UserPreferences.objects.get(user=user)
    percentage, clip_length = user_preferences.queue_CI, user_preferences.max_clip_length
    count = 1

    video_data = get_CI_video_sections(user, percentage, clip_length, count)
    id, start, end = video_data[0]
    video_object = Video.objects.get(id=id)
    url, title = video_object.url, video_object.title
    video = {'id': id, 'url': url, 'title': title, 'start': start, 'end': end}

    clip_start = f"{start // 60}:{start % 60:02d}"
    clip_end = f"{end // 60}:{end % 60:02d}"

    word_limit = 20
    common_words = (
        WordInstance.objects
        .filter(video=id, start__gte=start, end__lte=end)
        .annotate(
            root_word=Case(
                When(word__root__isnull=True, then=F('word__word_text')),
                default=F('word__root__word_text'),
                output_field=models.CharField()
            ),
            root_word_id=Case(
                When(word__root__isnull=True, then=F('word__id')),
                default=F('word__root__id'),
                output_field=models.IntegerField()
            ),
        )
        .values('root_word', 'root_word_id')
        .annotate(word_count=Count('id'))
        .order_by('-word_count')
    )
    known_words = set()
    if request.user.is_authenticated:
        known_words = set(UserWord.objects.filter(user=request.user).values_list('word__word_text', flat=True))
    new_words = list(common_words.exclude(root_word__in=known_words)[:word_limit])
    
    return render(request, 'watch_queue.html', {'video': video,
                                                'new_words': new_words,
                                                'clip_start': clip_start,
                                                'clip_end': clip_end})

@login_required(login_url="/login/")
def update_queue_ci(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        new_percentage = int(data.get('percentage'))
        clip_length = int(data.get('clip_length'))
        
        # Update the user's preference
        preference, created = UserPreferences.objects.get_or_create(user=request.user)
        preference.queue_CI = new_percentage
        preference.max_clip_length = clip_length
        preference.save()

        return JsonResponse({'status': 'success'})

    return JsonResponse({'status': 'error'})

@login_required(login_url="/login/")
def generate_questions(request, video_id, start, end):
    min_duration = 30
    length = end-start
    question_count = min(length//min_duration, 10)

    existing_questions = Question.objects.filter(video_id=video_id, start__gte=start, end__lte=end).order_by('id')
    existing_questions_list = list(existing_questions.values('id', 'text', 'start', 'end'))
    existing_questions_times = [(q['start'], q['end']) for q in existing_questions_list]

    sentences = Sentence.objects.filter(video_id=video_id, start__gte=start, end__lte=end).order_by('id')
    groups = group_sentences(sentences, min_duration)

    def overlaps_with_existing(group_start, group_end):
        for q_start, q_end in existing_questions_times:
            if not (group_end <= q_start or group_start >= q_end):
                return True
        return False
    
    new_groups = [
        group for group in groups 
        if not overlaps_with_existing(group['start'], group['end'])
    ]

    question_objects = []
    question_texts = []
    for group in new_groups:
        question = generate_question(group['text'])
        question_texts.append(question)
        question_object = Question(video_id=video_id, text=question, 
                                   start=group['start'], end=group['end'])
        question_objects.append(question_object)

    new_questions_list = []
    if question_objects:
        created_questions = Question.objects.bulk_create(question_objects)
        new_questions_list = [{'id': q.id, 'text': q.text} for q in created_questions]

    all_questions = existing_questions_list + new_questions_list
    sampled_questions = sample(all_questions, min(question_count, len(all_questions)))

    return JsonResponse({"questions": sampled_questions})

@login_required(login_url="/login/")
def submit_answers(request, video_id, start, end):
    if request.method == "POST":
        user = request.user
        data = json.loads(request.body)

        existing_answers = {answer.question_id: answer for answer in Answer.objects.filter(question_id__in=data.keys(), user=request.user)}

        answers_to_update = []
        answers_to_create = []

        for question_id, text in data.items():
            if question_id in existing_answers:
                existing_answers[question_id].text = text
                answers_to_update.append(existing_answers[question_id])
            else:
                answers_to_create.append(Answer(question_id=question_id, user=user, text=text))

        if answers_to_update:
            Answer.objects.bulk_update(answers_to_update, ['text'])
        if answers_to_create:
            Answer.objects.bulk_create(answers_to_create)

        sentences = Sentence.objects.filter(video_id=video_id, start__gte=start, end__lte=end).order_by('id')
        total_text = " ".join(sentences.values_list('text', flat=True))

        feedback = generate_feedback(data, total_text, user)
        return JsonResponse({"feedback": feedback})
    return JsonResponse({"error": "Invalid request"}, status=400)

@login_required(login_url="/login/")
def update_comprehension_filter(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            min_comprehension = data.get('min_comprehension', 0)
            max_comprehension = data.get('max_comprehension', 100)

            # Get or create user preferences
            user_preferences, created = UserPreferences.objects.get_or_create(user=request.user)

            user_preferences.comprehension_level_min = min_comprehension
            user_preferences.comprehension_level_max = max_comprehension
            user_preferences.save()
            # Return a success response
            return JsonResponse({'success': True})
        
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON data.'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    return JsonResponse({'success': False, 'error': 'Invalid request method.'})        

@login_required(login_url="/login/")
def review(request):
    user = request.user
    words_to_review = UserWord.objects.filter(user=user, needs_review=True, data__due__lte=now().isoformat())
    if not words_to_review.exists():
        message = "No Words to Review."
        words_data = []
        definitions = []
    else:
        message = None
        # Fetch all the words and prefetch their corresponding definitions
        words_data = list(words_to_review.values('id', 'word_id', 'word__word_text'))

        # Prefetch definitions based on the word IDs for the current user and fallback to the generic ones
        definition_queryset = Definition.objects.filter(
            Q(user=user) | Q(user=None),
            word_id__in=[word['word_id'] for word in words_data]
        )

        definitions_dict = {definition.word_id: definition.definition_text for definition in definition_queryset}

        definitions = [
            definitions_dict.get(word['word_id'], "")  # Default to an empty string if no definition is found
            for word in words_data
        ]

    return render(request, 'review.html', {
        'words_data': words_data, 
        'words_data_json': json.dumps(words_data), 
        'definitions': definitions,
        'definitions_json': json.dumps(definitions), 
        'message': message})

@login_required(login_url="/login/")
def submit_review(request, word_id, rating):
    if request.method == 'POST':
        if rating == 0:
            fsrs_rating = Rating.Again
        else:
            fsrs_rating = Rating.Good
        """
        Handles the submission of the user's review for a word.
        Rating is passed in (from 0 to 1) and used to update the review schedule.
        """
        user = request.user
        user_preferences = UserPreferences.objects.filter(user=user).first()
        desired_retention = user_preferences.desired_retention
        user_word = UserWord.objects.get(id=word_id, user=user)
        
        scheduler = Scheduler(desired_retention=desired_retention)
        card = user_word.load_card()
        card, _ = scheduler.review_card(card, fsrs_rating)
        user_word.save_card(card)

        return JsonResponse({'status': 'success'})

@login_required(login_url="/login/")
def change_review(request, word_id, needs_review):
    if request.method == 'POST':
        needs_review = needs_review.lower() == 'true'
        user_word = UserWord.objects.get(id=word_id, user=request.user)

        if needs_review:
            user_word.needs_review = True
        else:
            user_word.needs_review = False
        user_word.save()

        return redirect('review')

@login_required(login_url="/login/")
def update_definition(request, word_id):
    user = request.user
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_definition = data.get('new_definition')

            word = Word.objects.get(id=word_id)
            try:
                definition = Definition.objects.get(user=user, word=word)
                definition.definition_text = new_definition
                definition.save()
            except:
                definition = Definition(user=user, word=word, definition_text=new_definition)
                definition.save()

            return JsonResponse({'status': 'success'}, status=200)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=400)

def signup(request):
    max_user_count = 100
    if request.method == 'POST':
        if User.objects.count() > max_user_count:
            return redirect('signup')
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            setup_user(user)
            return redirect('login')
    max_users = False
    if User.objects.count() > max_user_count:
        max_users = True
    form = SignUpForm()
    return render(request, 'registration/signup.html', {'form': form, 'max_users': max_users})

@login_required(login_url="/login/")
def account(request):
    user = request.user
    user_preferences = UserPreferences.objects.get(user=user)
    email = user.email
    fsrs = user_preferences.fsrs
    retention_rate = round(user_preferences.desired_retention*100)
    return render(request, 'account.html', {'email': email, 
                                            'retention_rate': retention_rate,
                                            'fsrs': fsrs})

@login_required(login_url="/login/")
def save_account_settings(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user = request.user
            user_preferences = UserPreferences.objects.get(user=user)
            if data['fsrs'] == 'fsrs': user_preferences.fsrs = True
            else: user_preferences.fsrs = False
            user_preferences.desired_retention = int(data['retention_rate'])/100
            user_preferences.save()

            return JsonResponse({'message': 'Data received successfully', 'data': data}, status=200)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@login_required(login_url="/login/")
def watch_history(request):
    history = WatchHistory.objects.filter(user=request.user).order_by('-watched_at')
    return render(request, 'watch_history.html', {'history': history})

@login_required
def delete_watch_history(request, history_id):
    if request.method == "POST":
        history_item = get_object_or_404(WatchHistory, id=history_id, user=request.user)
        history_item.delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False}, status=400)

@login_required(login_url="/login/")
def vocab(request):

    return render(request, 'account.html')

@login_required(login_url="/login/")
def add_common_words(request):
    if request.method == 'POST':
        user = request.user
        data = json.loads(request.body)
        word_count = int(data.get('word_count'))

        new_words = get_common_words(user)
        new_words = new_words[:word_count]

        root_word_ids = [word['root_word_id'] for word in new_words]
        add_words(user, root_word_ids)
        calculate_video_CI(user.id)
        return JsonResponse({'status': 'success'})

    return JsonResponse({'status': 'error'})

def about(request):

    return render(request, 'about.html')

def search_word(request):
    query = request.GET.get('q', '')
    dropdown_count = 20
    if query:
        words = (
            Word.objects
            .filter(word_text__istartswith=query)
            .annotate(instance_count=Count('wordinstance'))
            .order_by('-instance_count', 'word_text')
            .values_list('word_text', flat=True)
        )
        
        distinct_words = list(dict.fromkeys(words))
        return JsonResponse(distinct_words[:dropdown_count], safe=False)

    return JsonResponse([], safe=False)

@login_required(login_url="/login/")
def learn(request):
    if request.method == "POST":
        user = request.user
        word_id = request.POST.get("word_id")
        if word_id:
            add_words(user, [word_id])
            calculate_video_CI(user.id)
            return redirect('learn')

    word_count = 20

    new_words = get_common_words(request.user)
    new_words = new_words[:word_count]

    return render(request, 'learn.html', {'new_words': new_words})

@login_required(login_url="/login/")
def add_vocab(request, word_id):
    if request.method == 'POST':
        user = request.user
        word = Word.objects.get(id=word_id).word_text

        add_words(user, [word_id])
        calculate_video_CI(user.id)
        return redirect('learn_word', word=word)

    return redirect('learn_word', word=word)

def learn_word(request, word):
    root_word = Word.objects.filter(word_text=word, root=None).first()
    if not root_word:
        child_word = Word.objects.filter(word_text=word).first()
        if not child_word:
            return redirect('learn')
        else:
            return redirect('learn_word', word=child_word.root.word_text)
    word_id = root_word.id
    
    can_learn = False
    if request.user.is_authenticated:
        if not UserWord.objects.filter(user=request.user, word=root_word).exists():
            can_learn = True

    definition = Definition.objects.get(user=None, word=root_word)
    if not definition.definition_text:
        add_definitions([root_word.id], root_word.lang.abb)
        definition = ""
    else: definition = definition.definition_text
    
    related_words = Word.objects.filter(Q(id=root_word.id) | Q(root=root_word))

    word_instances = WordInstance.objects.filter(word__in=related_words)
    
    video_id = word_instances.values('video').annotate(
        instance_count=Count('id')
    ).order_by('-instance_count').first()['video']

    video = Video.objects.get(id=video_id)
    
    video_data = ({
        'pk': video.pk,
        'title': video.title,
        'url': video.url,
    })

    conjugation_table = get_conjugation_table(root_word, None)

    words = WordInstance.objects.filter(video__id=video_id, word__in=related_words)

    return render(request, 'learn_word.html', {'word': word,
                                               'id': word_id,
                                               'definition': definition,
                                               'can_learn': can_learn,
                                               'words': words,
                                               'video_data': video_data,
                                               'conjugation_table': conjugation_table[0],
                                               'table_type': conjugation_table[1]},)

def search_word_flashcard(request):
    query = request.GET.get('q', '')
    dropdown_count = 20
    if query:
        words = (
            Word.objects
            .filter(word_text__istartswith=query)
            .annotate(instance_count=Count('wordinstance'))
            .order_by('-instance_count', 'word_text')
            .values('id', 'word_text')
        )
        
        word_dicts = [{'id': word['id'], 'word_text': word['word_text']} for word in words][:2*dropdown_count]
        # Ensure no duplicates by converting the list to a dictionary and back to a list
        distinct_word_dicts = list(dict.fromkeys([tuple(d.items()) for d in word_dicts]))
        distinct_word_dicts = [dict(items) for items in distinct_word_dicts]
        return JsonResponse(distinct_word_dicts[:dropdown_count], safe=False)

    return JsonResponse([], safe=False)

@login_required(login_url="/login/")
def add_flashcards(request):
    if request.method == 'POST':
        user = request.user
        data = json.loads(request.body)
        word_ids = data.get('word_ids', [])

        words = Word.objects.filter(id__in=word_ids).exclude(root__isnull=True)
        root_ids = list(words.values_list('root_id', flat=True))
        root_word_ids = list(set(root_ids+word_ids))
        print(root_word_ids)

        add_words(user, root_word_ids)
        calculate_video_CI(user.id)
        return JsonResponse({'status': 'success'}, status=200)
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@login_required(login_url="/login/")
def fetch_common_vocab(request, count):
    count = int(count)
    if count:
        if count == 0:
            return JsonResponse({'words': []})
        words = get_common_words(request.user)[:count]
        words = [{'id': word['root_word_id'], 'word_text': word['root_word']} for word in words]
        return JsonResponse({'words': words})
    
    return JsonResponse({'error': 'Invalid request or missing count parameter'}, status=400)

@login_required(login_url="/login/")
def get_conjugation_table_view(request, word_id):
    word = Word.objects.get(id=word_id)
    conjugation_table = get_conjugation_table(word, user=request.user)
    return JsonResponse({'status': 'success', 'conjugation_table': conjugation_table[0],
                         'table_type': conjugation_table[1]})

@login_required(login_url="/login/")
def save_selected_word(request):
    if request.method == "POST":
        data = json.loads(request.body)
        if data['is_selected']:
            add_words(request.user, [data['word_id']])
        if not data['is_selected']:
            remove_words(request.user, [data['word_id']])
    return JsonResponse({'status': 'success'})

@login_required(login_url="/login/")
def flashcards(request):
    if request.method == "POST":
        user = request.user
        user_preferences = UserPreferences.objects.get(user=user)

        if user_preferences.vocab_filter == 0:
            user_preferences.vocab_filter = 1
            user_preferences.save()
        elif user_preferences.vocab_filter == 1:
            user_preferences.vocab_filter = 0
            user_preferences.save()

        return JsonResponse({'status': 'success'})

    if request.user.is_authenticated:
        user = request.user
        user_preferences = UserPreferences.objects.get(user=user)
        filter_message = "Filter"

        if user_preferences.vocab_filter == 0:
            user_words = UserWord.objects.filter(user=user, word__root = None).select_related('word').order_by('word__word_text')
            filter_message = "A->Z"
        elif user_preferences.vocab_filter == 1:
            user_words = UserWord.objects.filter(user=user, word__root = None).select_related('word').order_by('-id')
            filter_message = "Recently Added"
        
        definition_queryset = Definition.objects.filter(
            Q(user=user) | Q(user=None)
        ).order_by('user')

        words_with_definitions = user_words.prefetch_related(
            Prefetch('word__definition_set', queryset=definition_queryset, to_attr='user_definitions')
        )

        result = [{
            'id': user_word.word.id,
            'word_text': user_word.word.word_text,
            'definition_text': user_word.word.user_definitions[0].definition_text if user_word.word.user_definitions else 'No definition available',
        } for user_word in words_with_definitions]

    return render(request, 'flashcards.html', {'words': result, 'filter_message': filter_message})
