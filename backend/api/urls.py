from django.urls import path
from .views import (
    current_user, user_preferences, user_login, user_signup, learn_word,
    words_learn, user_words, get_user_reviews, submit_review, conjugations,
    definitions, user_words_del, get_videos, video_words, get_questions, 
    submit_answers, user_words_conjugations, languages, common_words, search_words
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView
)

urlpatterns = [
    path('users/me/', current_user),
    path('users/me/preferences/', user_preferences, name='user-preferences'),
    path('users/me/userwords/', user_words, name='user-words'),
    path('users/me/reviews/', get_user_reviews, name='get-user-reviews'),

    path('words/learn/', words_learn, name='words-learn'),
    path('words/common/', common_words, name='common-words'),
    path('words/search/', search_words, name='search-words'),
    path('words/video/<int:video_id>/', video_words, name='video-words'),
    path('words/<int:word_id>/conjugations/', conjugations, name='conjugations'),

    path('userwords/<int:id>/update/<int:rating>/', submit_review, name='submit-review'),
    path('userwords/delete/', user_words_del, name='user-words-del'),
    path('userwords/conjugations/', user_words_conjugations, name='user_words_conjugations'),

    path('definitions/<int:word_id>/', definitions, name='definitions'),

    path('videos/', get_videos, name='videos'),

    path('learn/<int:word_id>/', learn_word, name='learn-word'),

    path('questions/video/<int:video_id>/', get_questions, name='questions'),

    path('answers/', submit_answers, name='feedback'),

    path('languages/', languages, name='languages'),

    path('login/', user_login, name='login'),
    path('signup/', user_signup, name='signup'),

    path('token/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('token/blacklist/', TokenBlacklistView.as_view(), name='token-blacklist'),
]
