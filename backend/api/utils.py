from .models import (
    Language, Word, WordInstance, UserWord, UserVideo, Video, 
    UserPreferences, Definition, Question, Sentence, Answer, Feedback,
    WordSet, WordSetVideoScore
)
from django.db import models, transaction
from django.db.models import Count, Case, When, F, Q, OuterRef, Subquery, IntegerField
from django.db.models.functions import Coalesce
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

        # Avoid duplicates: optionally clear existing scores first
        WordSetVideoScore.objects.filter(word_set=word_set).delete()

        # Bulk create new ones
        WordSetVideoScore.objects.bulk_create(video_score_objects)

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

