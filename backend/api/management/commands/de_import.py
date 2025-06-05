import json
import os
from api.models import Word, Language

from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):
    help = 'Extracts and writes filtered JSON rows for German pronouns from a Wiktextract JSONL file.'

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

        output_path = os.path.join(os.path.dirname(file_path), 'german_verbs_filtered.jsonl')

        try:
            with open(file_path, 'r', encoding='utf-8') as f_in, open(output_path, 'w', encoding='utf-8') as f_out:
                for line in f_in:
                    obj = json.loads(line)

                    lang_code = obj.get('lang_code')
                    lang = obj.get('lang')
                    pos = obj.get('pos')
                    text = obj.get('word')
                    ipa = obj.get('ipa')
                    forms = obj.get('forms', [])

                    # infinitive verbs
                    if (lang_code == 'de' or lang == 'Deutsch') and forms and pos == 'verb':
                        inf_word = Word(text=text, language=de, tag=None, wtype=None, abb=None, root=None, ipa=ipa)
                        filtered = {
                            'word': text,
                            'pos': pos,
                            'ipa': next((s.get('ipa') for s in obj.get('sounds', []) if 'ipa' in s), None),
                            'forms': forms
                        }

                        # Flatten tags from all senses
                        sense_tags = []
                        for sense in obj.get('senses', []):
                            sense_tags.extend(sense.get('tags', []))
                        filtered['tags'] = list(set(sense_tags)) if sense_tags else []

                        json.dump(filtered, f_out, ensure_ascii=False)
                        f_out.write('\n')

        except Exception as e:
            raise CommandError(f"Error processing file: {e}")



'''
poetry run python manage.py de_import "data/de-extract.jsonl"
'''