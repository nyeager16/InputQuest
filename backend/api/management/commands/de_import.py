import json
import os
from api.models import Word, Language

from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):
    help = 'Imports german linguistic data'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to de-extract.jsonl')

    def handle(self, *args, **options):
        file_path = options['file_path']

        if not os.path.exists(file_path):
            raise CommandError(f"File not found: {file_path}")
        if not file_path.endswith('.jsonl'):
            raise CommandError("Input file must be a .jsonl file.")
        
        words = []
        batchsize = 10000

        lang = "de"
        langname = "German"
        de, created = Language.objects.get_or_create(
            name=langname, abb=lang
        )

        with open(file_path, 'r', encoding='utf-8') as f_in:
            for line in f_in:
                if len(words) > batchsize:                        
                    Word.objects.bulk_create(words)
                    words.clear()
                obj = json.loads(line)

                pos = obj.get('pos')
                text = obj.get('word')
                forms = obj.get('forms', [])
                ipa = obj.get('ipa', None)

                # infinitive verbs
                if forms and pos == 'verb' and text.endswith('n'):
                    inf_word = Word(text=text, language=de, tag='inf', wtype=None, abb=None, root=None, ipa=ipa)
                    inf_word.save()
                    # conjugations
                    for form in forms:
                        form_text = form['form'].split()[-1]
                        tags = ':'.join(form.get('tags', []))
                        form_word = Word(text=form_text, language=de, tag=tags, wtype=None, abb=None, root=inf_word, ipa=None)
                        words.append(form_word)

                else:
                    root_word = Word(text=text, language=de, tag=None, wtype=None, abb=None, root=None, ipa=ipa)
                    root_word.save()
                    for form in forms:
                        form_text = form['form'].split()[-1]
                        tags = ':'.join(form.get('tags', []))
                        form_word = Word(text=form_text, language=de, tag=tags, wtype=None, abb=None, root=root_word, ipa=None)
                        words.append(form_word)

        if words:
            Word.objects.bulk_create(words)




'''
poetry run python manage.py de_import "data/de_cleaned.jsonl"
'''