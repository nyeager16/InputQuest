from .models import (
    Language, Word, WordInstance, UserWord, UserVideo, Video, 
    UserPreferences, Definition, Question, Sentence, Answer, Feedback,
    WordSet, WordSetVideoScore
)
from django.db import models, transaction
from django.db.models import Count, Case, When, F, Q, OuterRef, Subquery, IntegerField
from django.db.models.functions import Coalesce
from django.conf import settings
from openai import OpenAI
import hashlib

def get_common_words(language):
    words = Word.objects.filter(language=language, root=None).order_by('-instance_count')
    return words

def get_video_scores_for_wordset(word_ids: set) -> list[tuple[int, int]]:
    if not word_ids:
        return []

    # Create the same hash used during storage
    sorted_ids = sorted(word_ids)
    hash_input = ",".join(map(str, sorted_ids)).encode('utf-8')
    wordset_hash = hashlib.sha256(hash_input).hexdigest()

    try:
        word_set = WordSet.objects.get(hash=wordset_hash)
    except WordSet.DoesNotExist:
        return []

    # Retrieve and return (video_id, score) tuples
    return list(
        WordSetVideoScore.objects
        .filter(word_set=word_set)
        .values_list('video_id', 'score')
    )

def store_wordset_video_scores(word_ids: set, video_scores: list[tuple[int, int]]):
    if not word_ids or not video_scores:
        raise ValueError("Both word_ids and video_score_list must be non-empty.")

    # Sort the word_ids to ensure consistent hashing
    sorted_ids = sorted(word_ids)
    hash_input = ",".join(map(str, sorted_ids)).encode('utf-8')
    wordset_hash = hashlib.sha256(hash_input).hexdigest()

    with transaction.atomic():
        # Get or create the WordSet
        word_set, created = WordSet.objects.get_or_create(hash=wordset_hash)
        if created:
            word_set.words.set(sorted_ids)

        # Prepare the video score objects
        video_score_objects = []
        for video_id, score in video_scores:
            video_score_objects.append(WordSetVideoScore(
                word_set=word_set,
                video_id=video_id,
                score=score
            ))

        # Avoid duplicates
        WordSetVideoScore.objects.filter(word_set=word_set).delete()

        # Bulk create new ones
        WordSetVideoScore.objects.bulk_create(video_score_objects)
        return word_set

def generate_video_score_list(word_ids):
    # Get all words whose root is in the target set
    related_root_word_ids = set(
        Word.objects.filter(root_id__in=word_ids).values_list('id', flat=True)
    )

    all_matched_ids = word_ids | related_root_word_ids

    video_scores = []

    for video in Video.objects.all():
        word_instances = WordInstance.objects.filter(video=video)

        total_instances = word_instances.count()
        if total_instances == 0:
            score = 0
        else:
            matched_count = word_instances.filter(word_id__in=all_matched_ids).count()
            score = round((matched_count / total_instances) * 100)

        video_scores.append((video.id, score))

    return video_scores

def populate_user_video_scores(user_id, language_id, word_set):
    # Get all videos filtered by language
    videos = Video.objects.filter(language_id=language_id)

    # Get all WordSetVideoScore entries for the word_set and these videos
    wsvs_qs = WordSetVideoScore.objects.filter(
        word_set=word_set,
        video__in=videos
    ).select_related('video')

    # Map video_id -> score for quick lookup
    video_score_map = {wsvs.video_id: wsvs.score for wsvs in wsvs_qs}

    # Get existing UserVideo for this user and those videos (avoid duplicates)
    existing_uv_qs = UserVideo.objects.filter(user_id=user_id, video__in=videos)
    existing_uv_map = {uv.video_id: uv for uv in existing_uv_qs}

    # Prepare lists for bulk_create and bulk_update
    to_create = []
    to_update = []

    for video in videos:
        score = video_score_map.get(video.id, 0)
        if video.id in existing_uv_map:
            # Update existing UserVideo if score differs
            uv = existing_uv_map[video.id]
            if uv.score != score:
                uv.score = score
                to_update.append(uv)
        else:
            # Create new UserVideo
            to_create.append(UserVideo(user_id=user_id, video_id=video.id, score=score))

    with transaction.atomic():
        if to_create:
            UserVideo.objects.bulk_create(to_create, batch_size=500)
        if to_update:
            UserVideo.objects.bulk_update(to_update, ['score'], batch_size=500)

def generate_question(sentences):
    question_count = Question.objects.count()
    if question_count > 500:
        return "Maximum sitewide questions reached. The limit will increase once this feature exits beta."
    
    client = OpenAI(
        api_key=settings.OPENAI_API_KEY
    )

    prompt = f"In 1 sentence, generate a listening comprehension question based on the following sentence(s) in Polish:\n\n{sentences}"
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": "You are a helpful assistant that creates listening comprehension questions."
                    }
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    )

    return response.choices[0].message.content

def generate_feedback(answers, total_text, user):
    if Feedback.objects.count() >= 200:
        return {str(question_id): "Maximum sitewide feedback reached. The limit will increase once this feature exits beta." for question_id in data.keys()}
    feedback_dict = {}
    feedback_objects = []

    client = OpenAI(
        api_key=settings.OPENAI_API_KEY
    )

    for answer in answers:
        question = answer.question

        prompt = f"""
            Text: "{total_text}"

            Question: "{question.text}"

            Answer: "{answer.text}"

            Instruction: 
            - Provide feedback in **English** on the answer's grammar and spelling in 1-3 sentences.
            - Provide a **sample answer** in the **question's language** using the provided answer as a guide. The sample should be 1 sentence long.
            - Make sure to follow the format: "feedback \n example"
            """
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": "You are a helpful assistant that provides concise feedback in a natural way like an instructor speaking."
                        }
                    ]
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ],
            model="gpt-4o-mini",
        )
        feedback_text = response.choices[0].message.content
        feedback_dict[str(question.id)] = feedback_text

        feedback_objects.append(Feedback(answer=answer, user=user, text=feedback_text))
    if feedback_objects:
        Feedback.objects.bulk_create(feedback_objects)
    return feedback_dict