from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from .views import VideoDetailView

urlpatterns = [
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='all_videos'), name='logout'),
    path('signup/', views.signup, name='signup'),
    
    path('videos/', views.all_videos, name='all_videos'),
    path('update_comprehension_filter/', views.update_comprehension_filter, name='update_comprehension_filter'),
    path('video/<int:pk>/', VideoDetailView.as_view(), name='video_detail'),

    path('channel/<int:pk>/', views.channel_detail, name='channel_detail'),

    path('watch/', views.watch, name='watch'),
    path('watch/queue/', views.watch_queue, name='watch_queue'),
    path('update_queue_ci/', views.update_queue_ci, name='update_queue_ci'),

    path('learn/', views.learn, name='learn'),
    path('learn/<str:word>/', views.learn_word, name='learn_word'),

    path('review/', views.review, name='review'),
    path('review/<int:word_id>/submit/<int:rating>/', views.submit_review, name='submit_review'),
    path('review/<int:word_id>/change/<str:needs_review>/', views.change_review, name='change_review'),

    path('account/', views.account, name='account'),
    path('add_words/', views.add_common_words, name='add_common_words'),

    path('account/flashcards', views.flashcards, name='flashcards'),
    path('get-conjugation-table/<int:word_id>/', views.get_conjugation_table_view, name='get_conjugation_table'),
    path('save-selected-word/', views.save_selected_word, name='save_selected_word'),


    path('about/', views.about, name='about'),
    
    path('update-definition/<int:word_id>/', views.update_definition, name='update_definition'),
]