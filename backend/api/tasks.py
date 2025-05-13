from background_task import background
from django.contrib.auth.models import User
from .models import Word, WordInstance, UserWord, UserVideo, Video, UserPreferences, Definition
from django.db.models import Q
from deep_translator import GoogleTranslator
from deep_translator.exceptions import TranslationNotFound
from .utils import (
    generate_video_score_list, store_wordset_video_scores
)

@background()
def calculate_video_CI(user_id):
    try:
        user = User.objects.select_related('userpreferences').get(id=user_id)
    except User.DoesNotExist:
        return

    language = user.userpreferences.language
    videos = Video.objects.filter(language=language)

    # Fetch user known words (root words + conjugations)
    user_root_words = set(UserWord.objects.filter(user=user).values_list('word_id', flat=True))
    user_known_words = set(Word.objects.filter(Q(id__in=user_root_words) | Q(root_id__in=user_root_words)).values_list('id', flat=True))

    # Prepare batch update list
    user_videos_to_update = []

    for video in videos:
        word_instances = WordInstance.objects.filter(video=video).values_list('word_id', flat=True)
        total_words = len(word_instances)
        learned_words = sum(1 for word in word_instances if word in user_known_words)

        comprehension_percentage = round((learned_words / total_words * 100) if total_words > 0 else 0)

        user_video, created = UserVideo.objects.get_or_create(
            user=user, video=video,
            defaults={'percentage': comprehension_percentage}
        )
        if not created:
            user_video.percentage = comprehension_percentage
            user_videos_to_update.append(user_video)

    if user_videos_to_update:
        UserVideo.objects.bulk_update(user_videos_to_update, ['percentage'])

@background()
def add_definitions(word_ids, source):
    translator = GoogleTranslator(source=source, target='en')
    for word_id in word_ids:
        word = Word.objects.get(id=word_id)
        try:
            translated_word = translator.translate(text=word.text)
        except TranslationNotFound:
            translated_word = ""
        definition = Definition.objects.get(word=word, user=None)
        definition.definition_text = translated_word
        definition.save()

@background()
def calculate_user_video_scores(user_id):
    word_qs = Word.objects.filter(userword__user_id=user_id).distinct()
    word_ids = set(word_qs.values_list('id', flat=True))
    video_scores = generate_video_score_list(word_ids)
    store_wordset_video_scores(word_ids, video_scores)
