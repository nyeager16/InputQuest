from django.core.management.base import BaseCommand
from api.models import Word
from django.db.models import Count


class Command(BaseCommand):
    help = "Export duplicate root words and their children to word_hierarchy.txt"

    def handle(self, *args, **options):
        duplicate_texts = (
            Word.objects
            .filter(root__isnull=True, language_id=2)
            .values('text')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
            .values_list('text', flat=True)
        )

        roots = (
            Word.objects
            .filter(root__isnull=True, language_id=2, text__in=duplicate_texts)
            .select_related('language')
            .order_by('text')
        )

        output_file = "word_hierarchy.txt"
        with open(output_file, "w", encoding="utf-8") as f:
            for root in roots:
                f.write(
                    f"{root.text} (ID: {root.id}) | tag: {root.tag or '-'} | ipa: {root.ipa or '-'}\n"
                )
                children = root.derived_words.all().order_by('text')
                for child in children:
                    f.write(
                        f"  └─ {child.text} (ID: {child.id}) | tag: {child.tag or '-'} | ipa: {child.ipa or '-'}\n"
                    )

        self.stdout.write(self.style.SUCCESS(f"Export complete: {output_file}"))
