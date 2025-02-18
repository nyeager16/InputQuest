from django.core.management.base import BaseCommand
from app.models import Word, Channel, Video, WordInstance, Definition, UserWord, UserPreferences, User
from django.db import transaction, connection

class Command(BaseCommand):
    help = 'Deletes all data from Word, Channel, Video, WordInstance, and Definition models'

    def handle(self, *args, **kwargs):
        models_to_clear = [Word, Channel, Video, WordInstance, Definition, UserWord, UserPreferences, User]

        with transaction.atomic():
            for model in models_to_clear:
                deleted_count, _ = model.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_count} records from {model.__name__}'))

        self.reset_sequences()
        self.stdout.write(self.style.SUCCESS('Successfully reset sequences.'))

    def reset_sequences(self):
        with connection.cursor() as cursor:
            cursor.execute("ALTER SEQUENCE app_word_id_seq RESTART WITH 1;")
            cursor.execute("ALTER SEQUENCE app_channel_id_seq RESTART WITH 1;")
            cursor.execute("ALTER SEQUENCE app_video_id_seq RESTART WITH 1;")
            cursor.execute("ALTER SEQUENCE app_wordinstance_id_seq RESTART WITH 1;")
            cursor.execute("ALTER SEQUENCE app_definition_id_seq RESTART WITH 1;")
            cursor.execute("ALTER SEQUENCE app_userword_id_seq RESTART WITH 1;")
            cursor.execute("ALTER SEQUENCE app_userpreferences_id_seq RESTART WITH 1;")

# python manage.py resetdb