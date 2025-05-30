from django.core.management.base import BaseCommand
from django.db.models import Count
from api.models import Word, WordInstance

class Command(BaseCommand):
    help = "Efficiently updates instance_count for all root words."

    def handle(self, *args, **kwargs):
        self.stdout.write("Counting WordInstances directly tied to root words...")
        direct_counts = WordInstance.objects.filter(
            word__root__isnull=True
        ).values('word').annotate(count=Count('id'))

        self.stdout.write("Counting WordInstances of derived words (children)...")
        indirect_counts = WordInstance.objects.filter(
            word__root__isnull=False
        ).values('word__root').annotate(count=Count('id'))

        # Build lookup dictionaries
        direct_map = {item['word']: item['count'] for item in direct_counts}
        indirect_map = {item['word__root']: item['count'] for item in indirect_counts}

        self.stdout.write("Merging counts and preparing update list...")

        # Efficiently update in batches
        updated = []
        batch_size = 1000
        qs = Word.objects.filter(root__isnull=True).iterator(chunk_size=batch_size)

        for word in qs:
            direct = direct_map.get(word.id, 0)
            indirect = indirect_map.get(word.id, 0)
            word.instance_count = direct + indirect
            updated.append(word)

            if len(updated) >= batch_size:
                Word.objects.bulk_update(updated, ['instance_count'], batch_size=batch_size)
                updated = []

        # Final flush
        if updated:
            Word.objects.bulk_update(updated, ['instance_count'], batch_size=batch_size)

        self.stdout.write(self.style.SUCCESS("All root words updated."))
