from background_task import background
from django.contrib.auth.models import User
from .models import Word, WordInstance, UserWord, UserVideo, Video, UserPreferences, Definition
from django.db.models import Q
from deep_translator import GoogleTranslator

@background()
def calculate_video_CI(user_id):
    try:
        user = User.objects.get(id=user_id)
    except:
        return
    language = UserPreferences.objects.get(user=user).language
    videos = Video.objects.filter(language=language)

    # Get all root words connected to the user via UserWord
    user_root_words = UserWord.objects.filter(user=user).values_list('word_id', flat=True)

    # Get both root words and their conjugations (words whose root is one of the user's root words)
    user_known_words = Word.objects.filter(Q(id__in=user_root_words) | Q(root_id__in=user_root_words)).values_list('id', flat=True)

    for video in videos:
        word_instances = WordInstance.objects.filter(video=video)
        total_words = word_instances.count()
        learned_words = word_instances.filter(word_id__in=user_known_words).count()

        comprehension_percentage = (learned_words / total_words * 100) if total_words > 0 else 0
        comprehension_percentage = round(comprehension_percentage)

        user_video, created = UserVideo.objects.get_or_create(
            user=user, video=video,
            defaults={'percentage': comprehension_percentage}
        )
        if not created:
            # If the record already existed, update the percentage
            user_video.percentage = comprehension_percentage
            user_video.save()

@background()
def add_definitions(word_ids, source):
    translator = GoogleTranslator(source=source, target='en')
    for word_id in word_ids:
        word = Word.objects.get(id=word_id)
        translated_word = translator.translate(text=word.word_text)
        definition = Definition.objects.get(word=word, user=None)
        definition.definition_text = translated_word
        definition.save()