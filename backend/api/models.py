from django.db import models
from django.contrib.auth.models import User
from django.utils.timezone import now
from fsrs import Card

class Language(models.Model):
    name = models.CharField(max_length=100)
    abb = models.CharField(max_length=2)

class Word(models.Model):
    text = models.CharField(max_length=40, db_index=True)
    language = models.ForeignKey(Language, on_delete=models.SET_NULL, null=True, db_index=True)
    tag = models.CharField(max_length=60, null=True, db_index=True)
    wtype = models.CharField(max_length=60, null=True, db_index=True)
    abb = models.CharField(max_length=40, null=True, db_index=True)
    root = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, db_index=True, related_name='derived_words')
    instance_count = models.IntegerField(default=0)

class UserWord(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    word = models.ForeignKey(Word, on_delete=models.CASCADE)
    needs_review = models.BooleanField(default=True)

    def default_card_data():
        return Card().to_dict()

    data = models.JSONField(default=default_card_data)

    def save_card(self, card):
        self.data = card.to_dict()
        self.save()

    def load_card(self):
        return Card.from_dict(self.data)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'word'], name='unique_user_word')
        ]

class Definition(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    word = models.ForeignKey(Word, on_delete=models.CASCADE)
    text = models.TextField(null=True)

class Channel(models.Model):
    url = models.CharField(max_length=100)
    name = models.CharField(max_length=100, default="NA", null=True)

class Video(models.Model):
    url = models.CharField(max_length=100)
    title = models.CharField(max_length=100)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    language = models.ForeignKey(Language, on_delete=models.SET_NULL, null=True)
    auto_generated = models.BooleanField(default=True)

class UserVideo(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    percentage = models.FloatField(default=0.0)

class WordInstance(models.Model):
    word = models.ForeignKey(Word, on_delete=models.CASCADE)
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    start = models.IntegerField(default=0, db_index=True)
    end = models.IntegerField(default=0, db_index=True)

class Sentence(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    text = models.CharField(max_length=300, default="")
    start = models.IntegerField(default=0, db_index=True)
    end = models.IntegerField(default=0, db_index=True)

class WatchHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watch_history')
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='watch_history')
    watched_at = models.DateTimeField(default=now)
    start = models.IntegerField(default=0)
    end = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)

class Review(models.Model):
    user_word = models.ForeignKey(UserWord, on_delete=models.CASCADE)
    review_time = models.DateTimeField(auto_now_add=True)
    correct = models.BooleanField()
    familiarity_score_before = models.FloatField()
    familiarity_score_after = models.FloatField()
    duration = models.IntegerField(default=5000)
    elapsed_days = models.IntegerField(default=0)
    elapsed_seconds = models.IntegerField(default=0)

class Question(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    text = models.CharField(max_length=300, default="")
    start = models.IntegerField(default=0, db_index=True)
    end = models.IntegerField(default=0, db_index=True)

class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    text = models.TextField()

class Feedback(models.Model):
    answer = models.ForeignKey(Answer, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    text = models.TextField()

class UserPreferences(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    language = models.ForeignKey(Language, on_delete=models.SET_NULL, null=True)
    comprehension_level_min = models.IntegerField(default=0)
    comprehension_level_max = models.IntegerField(default=100)
    queue_CI = models.IntegerField(default=100)
    desired_retention = models.FloatField(default=0.9)
    fsrs = models.BooleanField(default=True)
    vocab_filter = models.IntegerField(default=0)
    max_clip_length = models.IntegerField(default=300)
