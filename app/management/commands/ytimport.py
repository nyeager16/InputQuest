from youtube_transcript_api import YouTubeTranscriptApi
import string
from math import floor, ceil
import scrapetube
import stanza
from django.core.management.base import BaseCommand
from app.models import Word, Channel, Video, Sentence, WordInstance, Language, UserVideo, User

# nlp = stanza.Pipeline("pl", processors="tokenize,pos")

# def classify_polish_pos(text):
#     doc = nlp(text)
#     pos_tags = []
    
#     for sentence in doc.sentences:
#         for word in sentence.words:
#             pos_tags.append((word.text, word.upos))
    
#     return pos_tags

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
            channel_url=channel_url,
            channel_name=channel_name
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
                text = text.translate(str.maketrans('','',string.punctuation)).lower()
                if text != "":
                    sentence = Sentence(video=vid, text=text, start=start, end=end)
                    sentences.append(sentence)
                all_words = text.split()
                for word in all_words:
                    if not Word.objects.filter(word_text=word).exists():
                        continue
                    dataword = Word.objects.filter(word_text=word).first()
                    wordinstances.append(WordInstance(word=dataword, 
                                                    video=vid, start=start, end=end))
            # print(classify_polish_pos(full_text))
            # return
        Video.objects.bulk_create(videos)
        Sentence.objects.bulk_create(sentences)
        WordInstance.objects.bulk_create(wordinstances)

        users = User.objects.all()
        for user in users:
            user_videos_to_create = [UserVideo(user=user,video=video) for video in videos]
            UserVideo.objects.bulk_create(user_videos_to_create)

# python manage.py ytimport "https://www.youtube.com/@EasyPolish" "pl"
# python manage.py ytimport "https://www.youtube.com/@Robert_Maklowicz" "pl"
# python manage.py ytimport "https://www.youtube.com/@DoRoboty" "pl"
# python manage.py ytimport "https://www.youtube.com/@LingoPutPolish" "pl"
