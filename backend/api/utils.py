from .models import (
    Language, Word, WordInstance, UserWord, UserVideo, Video, 
    UserPreferences, Definition, Question, Sentence, Answer, Feedback
)
from django.db import models
from django.db.models import Count, Case, When, F, Q, OuterRef, Subquery, IntegerField
from django.db.models.functions import Coalesce

def get_common_words(language):
    words = Word.objects.filter(language=language, root=None).order_by('-instance_count')
    return words
