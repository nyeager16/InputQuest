from youtube_transcript_api import YouTubeTranscriptApi
import string
from math import floor, ceil
import scrapetube
import stanza
import re
from django.core.management.base import BaseCommand
from api.models import Word, Channel, Video, Sentence, WordInstance, Language, UserVideo, User

nlp = stanza.Pipeline("pl", processors="tokenize,pos", tokenize_pretokenized=True)

def classify_polish_pos(text):
    doc = nlp(text)
    pos_tags = []
    
    for sentence in doc.sentences:
        for word in sentence.words:
            pos_tags.append((word.text, word.upos))
    return pos_tags

def best_match(stanza_pos, datawords):
    target_parts = stanza_pos.split(":")
    target_first = target_parts[0]

    def count_matching_components(word):
        if not word.tag:
            return -1

        word_parts = word.tag.split(":")
        
        # Ensure the first component matches
        if word_parts[0] != target_first:
            return -1
        
        # Count matching elements
        return sum(1 for part in word_parts if part in target_parts)

    # Filter valid candidates (must start with the same first component)
    valid_candidates = [word for word in datawords if word.tag and word.tag.startswith(target_first)]

    # Find the best match (max matching components)
    best_match = max(valid_candidates, key=count_matching_components, default=None)

    return best_match

def extract_sentences(transcript_data, video, word_threshold=15):
    sentence_list = []
    buffer_text = ""
    buffer_start = None
    buffer_end = None
    sentence_end_re = re.compile(r'([.?!]["\')\]]?\s+)')

    for entry in transcript_data:
        segment_text = entry['text'].replace("[Muzyka]", "").replace("[muzyka]", "").strip()
        if not segment_text:
            continue

        segment_start = entry['start']
        segment_end = segment_start + entry['duration']

        if buffer_start is None:
            buffer_start = segment_start

        buffer_text += (" " if buffer_text else "") + segment_text
        buffer_end = segment_end

        # Try splitting using punctuation
        parts = sentence_end_re.split(buffer_text)
        combined = []
        leftover = ""

        if len(parts) > 1:
            for i in range(0, len(parts) - 1, 2):
                combined.append(parts[i] + parts[i + 1])
            leftover = parts[-1] if len(parts) % 2 == 1 else ""
        else:
            # Not enough punctuation: fallback on word threshold
            words = buffer_text.split()
            if len(words) >= word_threshold:
                combined.append(buffer_text)
                leftover = ""

        total_chars = sum(len(s) for s in combined)
        if total_chars == 0:
            continue

        current_start = buffer_start
        current_time_span = buffer_end - buffer_start

        for sentence in combined:
            proportion = len(sentence) / total_chars
            duration = current_time_span * proportion
            sentence_end = current_start + duration

            sentence_list.append(Sentence(
                video=video,
                text=sentence.strip(),
                start=int(current_start),
                end=int(sentence_end)
            ))

            current_start = sentence_end

        # Update buffer with leftover
        buffer_text = leftover
        buffer_start = current_start if leftover.strip() else None
        buffer_end = None

    # Handle any remaining text
    if buffer_text.strip():
        safe_end = buffer_end if buffer_end is not None else buffer_start + 1
        sentence_list.append(Sentence(
            video=video,
            text=buffer_text.strip(),
            start=int(buffer_start),
            end=int(safe_end)
        ))
    return sentence_list

class Command(BaseCommand):
    help = "Imports data into the Word, Channel, Video, and WordInstance models"

    def add_arguments(self, parser):
        parser.add_argument('channel_url', type=str)
        parser.add_argument('language', type=str)

    def handle(self, *args, **options):
        channel_url = str(options['channel_url'])
        language = str(options['language'])

        language_object = Language.objects.get(abb=language)

        videos = []
        sentences = []
        wordinstances = []

        channel_name = channel_url.split("@")[-1]
        channel_videos = scrapetube.get_channel(channel_url=channel_url)

        channel, _ = Channel.objects.get_or_create(
            url=channel_url,
            name=channel_name
        )
        for video in channel_videos:
            videoID = video['videoId']
            if Video.objects.filter(url=videoID).exists():
                continue
            title = str(video['title']['runs'][0]['text'])
            try:
                tr = YouTubeTranscriptApi.get_transcript(videoID, 
                                                         languages=[language])
            except:
                continue

            auto = True
            transcript_list = YouTubeTranscriptApi.list_transcripts(videoID)
            transcript = transcript_list.find_transcript([language])
            is_generated = transcript.is_generated
            if not is_generated: auto = False
            vid = Video(url=videoID, title=title, channel=channel, 
                                language=language_object, auto_generated=auto)
            videos.append(vid)
            sentence_list = extract_sentences(tr, vid)
            sentences.extend(sentence_list)
            for sec in tr:
                '''
                sec is dict w/:
                'text', 'start', 'duration'
                '''
                start = floor(sec['start'])
                end = ceil(start+sec['duration'])
                text = sec['text']

                if language=='pl':
                    text = text.replace("[Muzyka]", "").replace("[muzyka]", "").strip()
                    text = text.translate(str.maketrans('','',string.punctuation))
                    text_pos = classify_polish_pos(text)
                    all_words = text.lower().split()
                    existing_words = set(Word.objects.filter(text__in=all_words).values_list('text', flat=True))
                    for i in range(len(all_words)):
                        word = all_words[i]
                        
                        stanza_pos = text_pos[i][1]

                        if word in existing_words:
                            datawords = Word.objects.filter(text=word)
                            
                            # edge cases
                            if word == 'też':
                                dataword = Word.objects.filter(text=word, root=None)
                                if dataword:
                                    wordinstances.append(WordInstance(word=dataword.first(), video=vid, start=start, end=end))
                                continue
                            elif word == 'mam':
                                dataword = Word.objects.filter(text=word, tag='fin:sg:pri:imperf')
                                if dataword:
                                    wordinstances.append(WordInstance(word=dataword.first(), video=vid, start=start, end=end))
                                continue
                            elif word == 'mają':
                                dataword = Word.objects.filter(text=word, root__text='mieć')
                                if dataword:
                                    wordinstances.append(WordInstance(word=dataword.first(), video=vid, start=start, end=end))
                                continue
                            elif word == 'mieć':
                                dataword = Word.objects.filter(text=word, root=None)
                                if dataword:
                                    wordinstances.append(WordInstance(word=dataword.first(), video=vid, start=start, end=end))
                                continue

                            datawords = Word.objects.filter(text=word)
                            if datawords.count() == 1:
                                wordinstances.append(WordInstance(word=datawords.first(), 
                                                                    video=vid, start=start, end=end))
                            else:
                                dataword = next((dw for dw in datawords if dw.tag and dw.tag == stanza_pos), None)
                                if dataword:
                                    wordinstances.append(WordInstance(word=dataword, 
                                                                        video=vid, start=start, end=end))
                                else:
                                    dataword = best_match(stanza_pos, datawords)
                                    if dataword:
                                        wordinstances.append(WordInstance(word=dataword, 
                                                                            video=vid, start=start, end=end))
                                    else:
                                        wordinstances.append(WordInstance(word=datawords.first(), 
                                                                            video=vid, start=start, end=end))
                elif language == 'de':

                    return
        Video.objects.bulk_create(videos)
        Sentence.objects.bulk_create(sentences)
        WordInstance.objects.bulk_create(wordinstances)

        users = User.objects.all()
        for user in users:
            user_videos_to_create = [UserVideo(user=user,video=video) for video in videos]
            UserVideo.objects.bulk_create(user_videos_to_create)

'''
poetry run python manage.py ytimport "https://www.youtube.com/@EasyPolish" "pl"
poetry run python manage.py ytimport "https://www.youtube.com/@Robert_Maklowicz" "pl"
poetry run python manage.py ytimport "https://www.youtube.com/@DoRoboty" "pl"
poetry run python manage.py ytimport "https://www.youtube.com/@LingoPutPolish" "pl"
'''