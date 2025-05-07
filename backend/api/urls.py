from django.urls import path
from .views import (
    hello_world, current_user, user_preferences, user_login, user_signup, all_user_words,
    common_words, change_user_words, all_user_word_ids
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('hello/', hello_world),
    path('me/', current_user),

    path('users/me/', current_user),
    path('users/me/preferences/', user_preferences, name='user-preferences'),
    path('users/me/userwords/', all_user_words, name='all-user-words'),
    path('users/me/userwords/ids/', all_user_word_ids, name='all-user-word-ids'),
    path('users/me/userwords/<int:id>/', change_user_words, name='change-user-words'),

    path('words/common/<int:count>/', common_words, name='common-words'),

    path('login/', user_login, name='login'),
    path('signup/', user_signup, name='signup'),

    path('token/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
