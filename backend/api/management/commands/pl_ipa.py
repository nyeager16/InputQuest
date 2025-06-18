import csv
from django.core.management.base import BaseCommand
from api.models import Word, Language

class Command(BaseCommand):
    help = 'Update IPA values for Polish words from pl_words_ipa.tsv'

    def handle(self, *args, **kwargs):
        tsv_path = "data/pl_words_ipa.tsv"
        batch = []
        updated = 0
        not_found = 0

        max_ipa_len = 0
        longest_ipa_word = None

        try:
            polish = Language.objects.get(name__iexact="Polish")
        except Language.DoesNotExist:
            self.stderr.write("Polish language not found in Language table.")
            return

        with open(tsv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter="\t")
            for row in reader:
                word_text = row["Word"].strip()
                ipa = row["IPA"].strip()

                if len(ipa) > max_ipa_len:
                    max_ipa_len = len(ipa)
                    longest_ipa_word = (word_text, ipa)

                word_qs = Word.objects.filter(text=word_text, language=polish, root=None)
                if word_qs.exists():
                    word = word_qs.first()
                    word.ipa = ipa
                    batch.append(word)
                    updated += 1
                else:
                    not_found += 1

        Word.objects.bulk_update(batch, ["ipa"])

        self.stdout.write(self.style.SUCCESS(f"IPA update prepared for {updated} words."))
        if not_found:
            self.stdout.write(f"{not_found} words not found in DB.")

        if longest_ipa_word:
            word, ipa = longest_ipa_word
            self.stdout.write("\nLongest IPA:")
            self.stdout.write(f"{word}\t{ipa}")
            self.stdout.write(f"Length: {len(ipa)}")
