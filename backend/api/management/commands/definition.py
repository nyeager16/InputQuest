from django.core.management.base import BaseCommand
from api.models import Word, Definition

class Command(BaseCommand):
    help = 'Add Definitions to Table'

    def handle(self, *args, **options):
        batchsize = 5000
        definitions = []

        words = Word.objects.all().iterator()

        for word in words:
            definition = Definition(user=None, word=word, text=None)
            definitions.append(definition)
            if len(definitions) > batchsize:
                Definition.objects.bulk_create(definitions)
                definitions.clear()
        if definitions:
            Definition.objects.bulk_create(definitions)


# python manage.py definition