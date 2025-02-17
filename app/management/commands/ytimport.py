from youtube_transcript_api import YouTubeTranscriptApi
import string
import scrapetube

from django.utils import timezone
from django.core.management.base import BaseCommand, CommandError
from app.models import Word, Channel, Video, WordInstance, Language, UserVideo, User


class Command(BaseCommand):
    help = "Imports data into the Word, Channel, Video, and WordInstance models"

    def add_arguments(self, parser):
        parser.add_argument('channel_url', type=str)
        parser.add_argument('language', type=str)

    def handle(self, *args, **options):
        channel_url = str(options['channel_url'])
        language = str(options['language'])

        language_object = Language.objects.get(abb=language)
        exclude_substrings = ['nazwisko','imię']

        videos = []
        wordinstances = []

        channel_name = channel_url.split("@")[-1]
        channel_videos = scrapetube.get_channel(channel_url=channel_url)

        channel, created = Channel.objects.get_or_create(
            channel_url=channel_url,
            channel_name=channel_name
        )

        for video in channel_videos:
            videoID = video['videoId']
            title = str(video['title']['runs'][0]['text'])
            if Video.objects.filter(url=videoID).exists():
                Video.objects.filter(url=videoID).delete()
                continue
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
                start = sec['start']
                end = round(start+sec['duration'], 2)
                text = sec['text']
                text = text.translate(str.maketrans('','',string.punctuation)).lower()
                allwords = text.split()
                for word in allwords:
                    if not Word.objects.filter(word_text=word).exists():
                        continue
                    dataword = Word.objects.filter(word_text=word).first()
                    if any(substring in dataword.wtype for substring in exclude_substrings):
                        continue
                    wordinstances.append(WordInstance(word=dataword, 
                                                    video=vid, start=start, end=end))

        Video.objects.bulk_create(videos)
        WordInstance.objects.bulk_create(wordinstances)

        users = User.objects.all()
        for user in users:
            user_videos_to_create = [UserVideo(user=user,video=video) for video in videos]
            UserVideo.objects.bulk_create(user_videos_to_create)
        

# python manage.py ytimport "https://www.youtube.com/@EasyPolish" "pl"
# python manage.py ytimport "https://www.youtube.com/@Robert_Maklowicz" "pl"
# python manage.py ytimport "https://www.youtube.com/@DoRoboty" "pl"
# python manage.py ytimport "https://www.youtube.com/@LingoPutPolish" "pl"
