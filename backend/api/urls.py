from django.urls import path
from .views import (
    hello_world, current_user, user_preferences, user_login, user_signup, user_words,
    common_words
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
    path('users/me/userwords/', user_words, name='user-words'),

    path('words/common/${count}', common_words, name='common-words'),

    path('login/', user_login, name='login'),
    path('signup/', user_signup, name='signup'),

    path('token/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
