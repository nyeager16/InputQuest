from django.core.management.base import BaseCommand
from api.models import Genre

class Command(BaseCommand):
    help = 'Creates Genre objects from a list of names'

    GENRES = [
        "Travel",
        "History",
        "Geography",
        "Science",
        "Technology",
        "Conversation",
        "News",
        "Sports"
    ]

    def handle(self, *args, **options):
        created = 0
        skipped = 0

        for name in self.GENRES:
            name = name.strip()
            genre, was_created = Genre.objects.get_or_create(name=name)
            if was_created:
                created += 1
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(f"\n Done. Created: {created}, Skipped: {skipped}"))