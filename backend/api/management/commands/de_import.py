import json
import os

from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):
    help = 'Extracts German words and their POS tags from a Wiktextract JSONL file.'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to de-extract.jsonl')

    def handle(self, *args, **options):
        file_path = options['file_path']

        if not os.path.exists(file_path):
            raise CommandError(f"File not found: {file_path}")
        if not file_path.endswith('.jsonl'):
            raise CommandError("Input file must be a .jsonl file.")

        output_path = os.path.join(os.path.dirname(file_path), 'german_words_pos.txt')
        count = 0

        try:
            with open(file_path, 'r', encoding='utf-8') as f_in, open(output_path, 'w', encoding='utf-8') as f_out:
                for line in f_in:
                    obj = json.loads(line)

                    # Filter only German entries
                    if obj.get('lang_code') == 'de' or obj.get('lang') == 'Deutsch':
                        word = obj.get('word')
                        pos = obj.get('pos')
                        if word and pos:
                            f_out.write(f"{word} - {pos}\n\n")
                            count += 1
        except Exception as e:
            raise CommandError(f"Error processing file: {e}")

        self.stdout.write(self.style.SUCCESS(f"Wrote {count} German entries to {output_path}"))


'''
poetry run python manage.py de_import "data/de-extract.jsonl"
'''