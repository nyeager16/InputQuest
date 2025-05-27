from django.urls import path
from .views import (
    current_user, user_preferences, user_login, user_signup, all_user_words,
    common_words, user_words, get_user_reviews, submit_review,
    definitions, user_words_del, get_videos, video_words, get_questions, submit_answers
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

    path('words/common/', common_words, name='common-words'),
    path('words/video/<int:video_id>/', video_words, name='video-words'),

    path('userwords/<int:id>/update/<int:rating>/', submit_review, name='submit-review'),
    path('userwords/delete/', user_words_del, name='user-words-del'),

    path('definitions/<int:word_id>/', definitions, name='definitions'),

    path('videos/', get_videos, name='videos'),

    path('questions/video/<int:video_id>/', get_questions, name='questions'),

    path('answers/', submit_answers, name='feedback'),

    path('login/', user_login, name='login'),
    path('signup/', user_signup, name='signup'),

    path('token/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('token/blacklist/', TokenBlacklistView.as_view(), name='token-blacklist'),
]
