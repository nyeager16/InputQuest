from collections import defaultdict
from django.views import View
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.utils.timezone import now
from .models import Video, WatchHistory, WordInstance, Word, UserWord, UserVideo, UserPreferences, Language, Definition
from django.db import models
from django.db.models import Case, When, Count, F, Q
from django.db.models.functions import Coalesce
from .forms import SignUpForm
from .tasks import calculate_video_CI
from .utils import setup_user, get_video_data, get_CI_video_sections, add_words
import json
from deep_translator import GoogleTranslator
from fsrs import Scheduler, Card, Rating, ReviewLog

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

        # Get video data (with comprehension percentage if user is authenticated)
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

@login_required(login_url="/app/login/")
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

@login_required(login_url="/app/login/")
def watch(request):
    if request.user.is_authenticated:
        user = request.user
        user_preferences = UserPreferences.objects.get(user=user)
        percentage = user_preferences.queue_CI
    return render(request, 'watch.html', {'percentage': percentage})

@login_required(login_url="/app/login/")
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

@login_required(login_url="/app/login/")
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

class VideoDetailView(View):
    def get(self, request, pk):
        video = get_object_or_404(Video, pk=pk)

        word_limit = 20

        common_words = (
            WordInstance.objects
            .filter(video=video)
            .annotate(
                # For root words, use the word's text; for non-root words, use the root's text
                root_word=Case(
                    When(word__root__isnull=True, then=F('word__word_text')), # If no root, use the word's text
                    default=F('word__root__word_text'), # Otherwise, use the root's text
                    output_field=models.CharField()
                ),
                root_word_id=Case(
                    When(word__root__isnull=True, then=F('word__id')), # If no root, use the word's own ID
                    default=F('word__root__id'), # Otherwise, use the root word's ID
                    output_field=models.IntegerField()
                ),
            )
            .values('root_word', 'root_word_id') # Include root word's ID
            .annotate(
                word_count=Count('id') # Count occurrences
            )
            .order_by('-word_count') # Sort by count, descending
        )

        # Get known words only if the user is logged in
        known_words = set()
        if request.user.is_authenticated:
            known_words = set(UserWord.objects.filter(user=request.user).values_list('word__word_text', flat=True))

        # Filter new words that the user does not already know
        new_words = [word for word in common_words if word['root_word'] not in known_words]

        new_words = new_words[:word_limit]

        child_words_mapping = defaultdict(set)  # Store child words as a set

        for row in new_words:
            root_id = row['root_word_id']
            child_words = (
                WordInstance.objects
                .filter(Q(video=video) & (Q(word__root__id=root_id) | Q(word__id=root_id)))
                .values_list('word__word_text', flat=True)  # Get the text of the child words
            )
            # Add child words to the mapping
            child_words_mapping[root_id].update(child_words)

        # Convert sets back to lists for rendering
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
        

@login_required(login_url="/app/login/")
def review(request):
    user = request.user
    # flash = UserWord.objects.filter(user=user).first()
    # carddata = flash.load_card()
    # carddata.due = now()
    # flash.save_card(carddata)
    words_to_review = UserWord.objects.filter(user=user, needs_review=True, data__due__lte=now().isoformat())
    #words_to_review = UserWord.objects.filter(user=user, needs_review=True, next_review__lte=now())
    print(words_to_review)
    if not words_to_review.exists():
        message = "No Words to Review."
        words_data = []
        definitions = []
    else:
        message = None 
        words_data = list(words_to_review.values('id', 'word_id', 'word__word_text'))
        word_id = words_data[0]['word_id']

        definitions = []
        for word in words_data:
            word_id = word['word_id']
            try:
                definition = Definition.objects.get(user=user, word_id=word_id)
            except:
                definition = Definition.objects.filter(user=None, word_id=word_id).first()
            if definition.definition_text == None:
                definitions.append("")
            else:
                definitions.append(definition.definition_text)

    return render(request, 'review.html', {
        'words_data': words_data, 
        'words_data_json': json.dumps(words_data), 
        'definitions': definitions,
        'definitions_json': json.dumps(definitions), 
        'message': message})

@login_required(login_url="/app/login/")
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

@login_required(login_url="/app/login/")
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

@login_required(login_url="/app/login/")
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
            user = form.save()  # Save the new user
            setup_user(user)
            return redirect('login')  # Redirect to the login page after sign up
    else:
        form = SignUpForm()
    return render(request, 'registration/signup.html', {'form': form})

def account(request):

    return render(request, 'account.html')

def about(request):

    return render(request, 'about.html')

@login_required(login_url="/app/login/")
def learn(request):
    if request.method == "POST":
        user = request.user
        word_id = request.POST.get("word_id")
        if word_id:
            add_words(user, [word_id])
            calculate_video_CI(user.id)
            return redirect('learn')

    # Get the user's language preference
    user_language = None
    if request.user.is_authenticated:
        user = request.user
        user_preferences = UserPreferences.objects.filter(user=user).first()
        if not user_preferences:
            language = Language.objects.filter(abb="pl").first()
            UserPreferences(user=user, language=language).save()
        user_language = user_preferences.language if user_preferences else None

    word_count = 20

    common_words = (
        WordInstance.objects
        .filter(video__language=user_language)
        .annotate(
            # For root words, use the word's text; for non-root words, use the root's text
            root_word=Case(
                When(word__root__isnull=True, then=F('word__word_text')), # If no root, use the word's text
                default=F('word__root__word_text'), # Otherwise, use the root's text
                output_field=models.CharField()
            ),
            root_word_id=Case(
                When(word__root__isnull=True, then=F('word__id')), # If no root, use the word's own ID
                default=F('word__root__id'), # Otherwise, use the root word's ID
                output_field=models.IntegerField()
            ),
        )
        .values('root_word', 'root_word_id')
        .annotate(word_count=Count('id')) # Count occurrences
        .order_by('-word_count') # Sort by count, descending
    )

    # Get known words only if the user is logged in
    known_words = set()
    if request.user.is_authenticated:
        known_words = set(UserWord.objects.filter(user=request.user).values_list('word__word_text', flat=True))

    # Filter new words that the user does not already know
    new_words = [word for word in common_words if word['root_word'] not in known_words]
    new_words = new_words[:word_count]

    return render(request, 'learn.html', {'new_words': new_words})

def learn_word(request, word):
    # Logic for handling the specific word
    root_word = Word.objects.filter(word_text=word, root=None).first()
    
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

    words = WordInstance.objects.filter(video__id=video_id, word__in=related_words)

    word_object = Word.objects.filter(word_text=word).first()
    if request.user.is_authenticated:
        user = request.user
        definition = Definition.objects.filter(user=user, word=word_object).first()
        if not definition:
            definition = Definition.objects.filter(user=None, word=word_object).first()
            if not definition:
                translated = GoogleTranslator(source='pl',target='en').translate(word)
                definition = Definition(user=None, word=word_object, definition_text=translated)
                definition.save()
    else:
        definition = None

    return render(request, 'learn_word.html', {'word': word, 
                                               'words': words,
                                               'video_data': video_data,
                                               'definition': definition},)

@login_required(login_url="/app/login/")
def flashcards(request):
    if request.user.is_authenticated:
        user = request.user
        user_words = UserWord.objects.filter(user=user).select_related('word')
        
        words_with_definitions = []

        for user_word in user_words:
            word = user_word.word
            # Fetch the user's definition if available, otherwise fallback to the generic definition
            definition = Definition.objects.filter(word=word).filter(
                Q(user=user) | Q(user=None)
            ).order_by('user').first()
            words_with_definitions.append({
                'id': word.id,
                'word_text': word.word_text,
                'definition_text': definition.definition_text,
            })

    return render(request, 'flashcards.html', {'words': words_with_definitions})
