from .models import (
    Language, Word, WordInstance, UserWord, UserVideo, Video, 
    UserPreferences, Definition, Question, Sentence, Answer, Feedback
)
from django.db import models
from django.db.models import Case, When, Count, F
from django.db.models.functions import Coalesce
from django.conf import settings
from .tasks import add_definitions
from collections import deque, defaultdict
import heapq
from openai import OpenAI
import torch
import torch.nn as nn
import pandas as pd

def setup_user(user):
    videos = Video.objects.all()
    user_videos_to_create = [UserVideo(user=user,video=video) for video in videos]
    UserVideo.objects.bulk_create(user_videos_to_create)
    language = Language.objects.get(abb="pl")
    UserPreferences(user=user, language=language).save()

def get_common_words(user):
    user_preferences = UserPreferences.objects.only('language').get(user=user)
    user_language = user_preferences.language

    common_words = (
        WordInstance.objects
        .filter(video__language=user_language)
        .annotate(
            # For root words, use the word's text; for non-root words, use the root's text
            root_word=Case(
                When(word__root__isnull=True, then=F('word__word_text')), # If no root, use the word's text
                default=F('word__root__word_text'), # Otherwise, use the root's text
                output_field=models.CharField()
            ),
            root_word_id=Case(
                When(word__root__isnull=True, then=F('word__id')), # If no root, use the word's own ID
                default=F('word__root__id'), # Otherwise, use the root word's ID
                output_field=models.IntegerField()
            ),
        )
        .values('root_word', 'root_word_id')
        .annotate(word_count=Count('id')) # Count occurrences
        .order_by('-word_count') # Sort by count, descending
    )

    known_words = set(UserWord.objects.filter(user=user).values_list('word__word_text', flat=True))

    new_words = [word for word in common_words if word['root_word'] not in known_words]

    return new_words

def add_words(user, word_ids):
    defined_word_ids = Definition.objects.filter(word_id__in=word_ids, definition_text__isnull=False).values_list('word_id', flat=True)
    undefined_word_ids = list(set(word_ids) - set(defined_word_ids))
    if undefined_word_ids:
        add_definitions(undefined_word_ids, 'pl')
    words = Word.objects.filter(id__in=word_ids)
    user_words = [UserWord(user=user, word=word) for word in words]
    UserWord.objects.bulk_create(user_words)

def remove_words(user, word_ids):
    UserWord.objects.filter(user=user, word__id__in=word_ids).delete()

def get_video_data(videos, user=None, comprehension_level_min=0, comprehension_level_max=100):
    video_data = []
    for video in videos:
        if user:
            comprehension_percentage = UserVideo.objects.get(user=user, video=video).percentage
            if not (comprehension_level_min <= comprehension_percentage <= comprehension_level_max):
                continue
        else:
            comprehension_percentage = 0

        video_data.append({
            'pk': video.pk,
            'title': video.title,
            'url': video.url,
            'channel_pk': video.channel.pk,
            'channel_name': video.channel.channel_name,
            'comprehension_percentage': comprehension_percentage,
        })
    return video_data

def group_sentences(sentences, min_duration=30):
    groups = []
    current_group = []
    current_start = None
    current_end = None

    for sentence in sentences:
        if not current_group:
            # Start a new group
            current_group.append(sentence)
            current_start = sentence.start
            current_end = sentence.end
            continue

        # Check if adding this sentence keeps the group duration under the minimum required
        if (sentence.end - current_start) >= min_duration:
            group_text = " ".join(s.text for s in current_group)
            groups.append({'text': group_text, 'start': current_start, 'end': current_end})

            # Start a new group
            current_group = [sentence]
            current_start = sentence.start
            current_end = sentence.end
        else:
            # Add sentence to the current group
            current_group.append(sentence)
            current_end = sentence.end

    return groups


def generate_question(sentences):
    question_count = Question.objects.count()
    if question_count > 500:
        return "Maximum sitewide questions reached. The limit will increase once this feature exits beta."
    
    client = OpenAI(
        api_key=settings.OPENAI_API_KEY
    )

    prompt = f"Given the following sentences from a video transcript, generate a listening comprehension question in Polish:\n\nSentences:\n{sentences}\n\nQuestion:"
    
    response = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="gpt-4o-mini",
    )

    return response.choices[0].message.content

def generate_feedback(data, total_text, user):
    if Feedback.objects.count() >= 200:
        return {str(question_id): "Maximum sitewide feedback reached. The limit will increase once this feature exits beta." for question_id in data.keys()}
    feedback_dict = {}
    feedback_objects = []

    client = OpenAI(
            api_key=settings.OPENAI_API_KEY
        )

    answers = Answer.objects.filter(question_id__in=data.keys(), user=user).select_related("question")
    for answer in answers:
        question = answer.question

        prompt = f"""
            Given the following text:
            
            \"\"\"{total_text}\"\"\"
            
            Provide feedback to the user's answer in English in 1-3 sentences, providing a sample answer in Polish if needed.
            
            **Question:** {question.text}
            **User's Answer:** {answer.text}
            """
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
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

def get_optimal_review_time(predicted_days, retention_threshold=0.9):
    adjusted_days = max(1, predicted_days * (1.0 / retention_threshold))
    return adjusted_days

def get_CI_video_sections(user, percentage, clip_length, count):
    known_words = set(
        UserWord.objects.filter(user=user).values_list('word', flat=True)
    )
    
    preferences = UserPreferences.objects.get(user=user)
    videos = Video.objects.filter(language=preferences.language).exclude(
        watch_history__user=user
    ).only('id')
    word_instances = WordInstance.objects.filter(video__in=videos).annotate(
        root_word=Coalesce('word__root', 'word')
    ).values_list('video_id', 'root_word', 'start', 'end')

    video_words_dict = defaultdict(list)
    for video_id, root_word, start, end in word_instances:
        video_words_dict[video_id].append((root_word, start, end))
    sections = []
    
    # Process each video's word instances using a sliding window
    for video_id, words in video_words_dict.items():
        queue = deque()
        known_count = 0
        total_count = 0

        for root_word, start, end in words:
            queue.append((root_word, start, end))
            total_count += 1
            if root_word in known_words:
                known_count += 1

            while queue and (known_count / total_count) * 100 < percentage:
                old_word, _, _ = queue.popleft()
                total_count -= 1
                if old_word in known_words:
                    known_count -= 1
            
            # Valid section found
            if queue:
                start_time = queue[0][1]
                end_time = queue[-1][2]
                duration = end_time - start_time
                
                if duration <= clip_length:  # Enforce clip length constraint
                    sections.append((video_id, start_time, end_time, duration))
    
    # Get top `count` longest sections
    top_sections = heapq.nlargest(count, sections, key=lambda x: x[3])
    
    result = []
    global_last_end = {}
    
    for video_index, start_time, end_time, _ in top_sections:
        if start_time >= global_last_end.get(video_index, 0):
            result.append((video_index, start_time, end_time))
            global_last_end[video_index] = end_time
            if len(result) == count:
                break
    
    return result


def adj_table(table_dict, table_index, word, split_word):
    if split_word[1] == 'pl':
        table_index += 3
        if 'm' in split_word[3] and 'f' in split_word[3]: table_index += 1
        table_dict[table_index] = [word.id, word.word_text, False]
    else:
        for sg_tag in split_word[3].split('.'):
            if sg_tag == 'n':
                table_index += 1
                table_dict[table_index] = [word.id, word.word_text, False]
            elif sg_tag == 'f':
                table_index += 2
                table_dict[table_index] = [word.id, word.word_text, False]
            else:
                table_dict[table_index] = [word.id, word.word_text, False]
    return table_dict

def get_conjugation_table(word, user):
    tag = word.tag
    # Verb
    table_dict = {}
    table_type = -1
    split_tag = tag.split(":")
    if split_tag[0] == "inf":
        table_type = 0
        table_dict = {i: [-1, '', False] for i in range(21)}
        '''
        0-5: 1p sg, pl; 2p sg, pl; 3p sg, pl
        6-15: sg; 1p m,f; 2p m,f; 3p m,f,n
        16-20: pl; 1p m,f; 2p m,f; 3p m,f
        '''
        child_words = Word.objects.filter(root=word)
        user_words = set()
        if user:
            user_words = set(UserWord.objects.filter(user=user, needs_review=True, word__root__isnull=False).values_list('word__id', flat=True))
        for word in child_words:
            table_index = 0
            # Present form
            if word.tag in ["fin:sg:pri:imperf", "fin:sg:pri:perf"]:
                table_dict[0] = [word.id, word.word_text, word.id in user_words]
            elif word.tag in ["fin:pl:pri:imperf", "fin:pl:pri:perf"]:
                table_dict[1] = [word.id, word.word_text, word.id in user_words]
            elif word.tag in ["fin:sg:sec:imperf", "fin:sg:sec:perf"]:
                table_dict[2] = [word.id, word.word_text, word.id in user_words]
            elif word.tag in ["fin:pl:sec:imperf", "fin:pl:sec:perf"]:
                table_dict[3] = [word.id, word.word_text, word.id in user_words]
            elif word.tag in ["fin:sg:ter:imperf", "fin:sg:ter:perf"]:
                table_dict[4] = [word.id, word.word_text, word.id in user_words]
            elif word.tag in ["fin:pl:ter:imperf", "fin:pl:ter:perf"]:
                table_dict[5] = [word.id, word.word_text, word.id in user_words]

            # Past form
            split_word = word.tag.split(":")
            if split_word[0] == 'praet' and split_word[3] == 'pri' and split_word[1] == 'sg' and 'm' in split_word[2]:
                table_dict[6] = [word.id, word.word_text, word.id in user_words]
            elif split_word[0] == 'praet' and split_word[3] == 'pri' and split_word[1] == 'sg' and split_word[2] == 'f':
                table_dict[7] = [word.id, word.word_text, word.id in user_words]
            # table_dict[8] always empty
            elif split_word[0] == 'praet' and split_word[3] == 'pri' and split_word[1] == 'pl' and 'm' in split_word[2] and 'f' not in split_word[2]:
                table_dict[9] = [word.id, word.word_text, word.id in user_words]
            elif split_word[0] == 'praet' and split_word[3] == 'pri' and split_word[1] == 'pl' and 'm' in split_word[2] and 'f' in split_word[2]:
                table_dict[10] = [word.id, word.word_text, word.id in user_words]
            elif split_word[0] == 'praet' and split_word[3] == 'sec' and split_word[1] == 'sg' and 'm' in split_word[2]:
                table_dict[11] = [word.id, word.word_text, word.id in user_words]
            elif split_word[0] == 'praet' and split_word[3] == 'sec' and split_word[1] == 'sg' and split_word[2] == 'f':
                table_dict[12] = [word.id, word.word_text, word.id in user_words]
            # table_dict[13] always empty
            elif split_word[0] == 'praet' and split_word[3] == 'sec' and split_word[1] == 'pl' and 'm' in split_word[2] and 'f' not in split_word[2]:
                table_dict[14] = [word.id, word.word_text, word.id in user_words]
            elif split_word[0] == 'praet' and split_word[3] == 'sec' and split_word[1] == 'pl' and 'm' in split_word[2] and 'f' in split_word[2]:
                table_dict[15] = [word.id, word.word_text, word.id in user_words]
            elif split_word[0] == 'praet' and split_word[3] == 'ter' and split_word[1] == 'sg' and 'm' in split_word[2]:
                table_dict[16] = [word.id, word.word_text, word.id in user_words]
            elif split_word[0] == 'praet' and split_word[3] == 'ter' and split_word[1] == 'sg' and split_word[2] == 'f':
                table_dict[17] = [word.id, word.word_text, word.id in user_words]
            elif split_word[0] == 'praet' and split_word[3] == 'ter' and split_word[1] == 'sg' and split_word[2] == 'n':
                table_dict[18] = [word.id, word.word_text, word.id in user_words]
            elif split_word[0] == 'praet' and split_word[3] == 'ter' and split_word[1] == 'pl' and 'm' in split_word[2] and 'f' not in split_word[2]:
                table_dict[19] = [word.id, word.word_text, word.id in user_words]
            elif split_word[0] == 'praet' and split_word[3] == 'ter' and split_word[1] == 'pl' and 'm' in split_word[2] and 'f' in split_word[2]:
                table_dict[20] = [word.id, word.word_text, word.id in user_words]
    # Noun
    elif split_tag[0] == "subst":
        table_type = 1
        table_dict = {i: [-1, '', False] for i in range(14)}
        '''
        0-6: sg
        7-13: pl
        nom, gen, dat, acc, instr, loc, voc
        '''
        child_words = Word.objects.filter(root=word)
        child_words = list(child_words)
        child_words.append(word)
        user_words = set()
        if user:
            user_words = set(UserWord.objects.filter(user=user, needs_review=True, word__root__isnull=False).values_list('word__id', flat=True))
        for word in child_words:
            split_word = word.tag.split(":")
            if len(split_word) < 3:
                continue
            for tense in split_word[2].split("."):
                table_index = 0
                if tense == 'nom':
                    if split_word[1] == 'pl': table_index = 7
                    table_dict[0+table_index] = [word.id, word.word_text, word.id in user_words]
                elif tense == 'gen':
                    if split_word[1] == 'pl': table_index = 7
                    table_dict[1+table_index] = [word.id, word.word_text, word.id in user_words]
                elif tense == 'dat':
                    if split_word[1] == 'pl': table_index = 7
                    table_dict[2+table_index] = [word.id, word.word_text, word.id in user_words]
                elif tense == 'acc':
                    if split_word[1] == 'pl': table_index = 7
                    table_dict[3+table_index] = [word.id, word.word_text, word.id in user_words]
                elif tense == 'inst':
                    if split_word[1] == 'pl': table_index = 7
                    table_dict[4+table_index] = [word.id, word.word_text, word.id in user_words]
                elif tense == 'loc':
                    if split_word[1] == 'pl': table_index = 7
                    table_dict[5+table_index] = [word.id, word.word_text, word.id in user_words]
                elif tense == 'voc':
                    if split_word[1] == 'pl': table_index = 7
                    table_dict[6+table_index] = [word.id, word.word_text, word.id in user_words]
    # Adjective
    elif split_tag[0] == "adj":
        table_type = 2
        table_dict = {i: [-1, '', False] for i in range(35)}
        '''
        7 rows: nom, gen, dat, acc, instr, loc, voc
        m, n, f, m pl., other pl.
        '''
        child_words = Word.objects.filter(root=word)
        child_words = list(child_words)
        child_words.append(word)
        for word in child_words:
            split_word = word.tag.split(":")
            if split_word[-1] == 'pos' and len(split_word) > 4:
                for tense in split_word[2].split("."):
                    if tense == 'nom':
                        table_index = 0
                        table_dict = adj_table(table_dict, table_index, word, split_word)
                    elif tense == 'gen':
                        table_index = 5
                        table_dict = adj_table(table_dict, table_index, word, split_word)
                    elif tense == 'dat':
                        table_index = 10
                        table_dict = adj_table(table_dict, table_index, word, split_word)
                    elif tense == 'acc':
                        table_index = 15
                        table_dict = adj_table(table_dict, table_index, word, split_word)
                    elif tense == 'inst':
                        table_index = 20
                        table_dict = adj_table(table_dict, table_index, word, split_word)
                    elif tense == 'loc':
                        table_index = 25
                        table_dict = adj_table(table_dict, table_index, word, split_word)
                    elif tense == 'voc':
                        table_index = 30
                        table_dict = adj_table(table_dict, table_index, word, split_word)

    return (table_dict, table_type)
