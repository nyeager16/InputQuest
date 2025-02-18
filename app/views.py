from collections import defaultdict
from django.views import View
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils.timezone import now
from .models import Video, Channel, WatchHistory, WordInstance, Word, UserWord, UserVideo, UserPreferences, Language, Definition
from django.db import models
from django.db.models import Case, When, Count, F, Q, Prefetch
from .forms import SignUpForm
from .tasks import calculate_video_CI
from .utils import setup_user, get_video_data, get_CI_video_sections, add_words, get_common_words, get_conjugation_table, remove_words
import json
from fsrs import Scheduler, Rating

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

@login_required(login_url="/login/")
def update_queue_ci(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        new_percentage = int(data.get('percentage'))
        
        # Update the user's preference
        preference, created = UserPreferences.objects.get_or_create(user=request.user)
        preference.queue_CI = new_percentage
        preference.save()

        return JsonResponse({'status': 'success', 'percentage': new_percentage})

    return JsonResponse({'status': 'error'})

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

        # Retrieve all child words in a single query
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
    return render(request, 'watch.html', {'percentage': percentage})

@login_required(login_url="/login/")
def watch_queue(request):
    user = request.user

    if request.method == 'POST':
        action = request.POST.get('action')  # Determine which button was clicked

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
    percentage = user_preferences.queue_CI
    count = 10

    video_data = get_CI_video_sections(user, percentage, count)
    id, start, end = video_data[0]
    url = Video.objects.get(id=id).url
    video = {'id': id, 'url': url, 'start': round(start), 'end': round(end)}

    return render(request, 'watch_queue.html', {'video': video})

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
        Rating is passed in (from 0 to 4) and used to update the review schedule.
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
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            setup_user(user)
            return redirect('login')
    else:
        form = SignUpForm()
    return render(request, 'registration/signup.html', {'form': form})

@login_required(login_url="/login/")
def account(request):

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

def learn_word(request, word):
    root_word = Word.objects.filter(word_text=word, root=None).first()
    if not root_word:
        child_word = Word.objects.filter(word_text=word).first()
        if not child_word:
            return redirect('learn')
        else:
            return redirect('learn_word', word=child_word.root.word_text)
    
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
                                               'words': words,
                                               'video_data': video_data,
                                               'conjugation_table': conjugation_table[0],
                                               'table_type': conjugation_table[1]},)

@login_required(login_url="/login/")
def get_conjugation_table_view(request, word_id):
    word = Word.objects.get(id=word_id)
    conjugation_table = get_conjugation_table(word, user=request.user)
    print(conjugation_table)
    return JsonResponse({'status': 'success', 'conjugation_table': conjugation_table[0],
                         'table_type': conjugation_table[1]})

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
