from youtube_transcript_api import YouTubeTranscriptApi
import string
from math import floor, ceil
import scrapetube
import stanza
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

        channel, created = Channel.objects.get_or_create(
            url=channel_url,
            name=channel_name
        )
        for video in channel_videos:
            full_text = ""
            timestamps = {}
            curr_index = 0
            videoID = video['videoId']
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
            for sec in tr:
                '''
                sec is dict w/:
                'text', 'start', 'duration'
                '''
                start = floor(sec['start'])
                end = ceil(start+sec['duration'])
                text = sec['text']
                text = text.replace("[Muzyka]", "").replace("[muzyka]", "")
                timestamps[curr_index] = [start, end]
                curr_index += len(text)
                full_text = full_text + " " + text
                text = text.translate(str.maketrans('','',string.punctuation))
                if text != "":
                    sentence = Sentence(video=vid, text=text, start=start, end=end)
                    sentences.append(sentence)
                text_pos = classify_polish_pos(text)
                text = text.lower()
                all_words = text.split()
                existing_words = set(Word.objects.filter(text__in=all_words).values_list('text', flat=True))
                for i in range(len(all_words)):
                    word = all_words[i]
                    
                    stanza_pos = text_pos[i][1]

                    if word in existing_words:
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
        Video.objects.bulk_create(videos)
        Sentence.objects.bulk_create(sentences)
        WordInstance.objects.bulk_create(wordinstances)

        users = User.objects.all()
        for user in users:
            user_videos_to_create = [UserVideo(user=user,video=video) for video in videos]
            UserVideo.objects.bulk_create(user_videos_to_create)

'''
python manage.py ytimport "https://www.youtube.com/@EasyPolish" "pl"
python manage.py ytimport "https://www.youtube.com/@Robert_Maklowicz" "pl"
python manage.py ytimport "https://www.youtube.com/@DoRoboty" "pl"
python manage.py ytimport "https://www.youtube.com/@LingoPutPolish" "pl"
'''