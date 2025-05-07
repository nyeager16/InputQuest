from django.core.management.base import BaseCommand
from django.db.models import Count, Q, F
from api.models import Word

class Command(BaseCommand):
    help = "Bulk updates instance_count for Words where root is None"

    def handle(self, *args, **kwargs):
        # Get all root words
        root_words = Word.objects.filter(root__isnull=True).prefetch_related('derived_words', 'wordinstance_set')

        updated_words = []

        for word in root_words:
            # Direct instances (wordinstance_set is reverse FK from WordInstance to Word)
            direct_count = word.wordinstance_set.count()

            # Indirect instances: word instances from derived_words
            indirect_count = sum(
                dw.wordinstance_set.count()
                for dw in word.derived_words.all()
            )

            word.instance_count = direct_count + indirect_count
            updated_words.append(word)

        Word.objects.bulk_update(updated_words, ['instance_count'])

        self.stdout.write(self.style.SUCCESS(f"{len(updated_words)} words updated with instance counts."))