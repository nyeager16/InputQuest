from django.core.management.base import BaseCommand
from django.db import connection, transaction
from app.models import Word, Channel, Video, WordInstance, Definition, UserWord, UserPreferences, User

class Command(BaseCommand):
    help = 'Deletes all data from Word, Channel, Video, WordInstance, and Definition models in batches'

    def handle(self, *args, **kwargs):
        models_to_clear = [Word, Channel, Video, WordInstance, Definition, UserWord, UserPreferences, User]
        batch_size = 50000

        with transaction.atomic():
            for model in models_to_clear:
                self.delete_in_batches(model, batch_size)

        self.reset_sequences()
        self.stdout.write(self.style.SUCCESS('Successfully deleted records and reset sequences.'))

    def delete_in_batches(self, model, batch_size):
        """Fetches and deletes objects in batches to avoid memory overload."""
        total_deleted = 0
        while True:
            ids = list(model.objects.values_list('id', flat=True)[:batch_size])
            if not ids:
                break

            deleted_count, _ = model.objects.filter(id__in=ids).delete()
            total_deleted += deleted_count
            self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_count} records from {model.__name__}'))

        self.stdout.write(self.style.SUCCESS(f'Total deleted from {model.__name__}: {total_deleted}'))

    def reset_sequences(self):
        """Resets the primary key sequence for all models."""
        with connection.cursor() as cursor:
            sequences = [
                "app_word_id_seq",
                "app_channel_id_seq",
                "app_video_id_seq",
                "app_wordinstance_id_seq",
                "app_definition_id_seq",
                "app_userword_id_seq",
                "app_userpreferences_id_seq",
            ]
            for seq in sequences:
                cursor.execute(f"ALTER SEQUENCE {seq} RESTART WITH 1;")
