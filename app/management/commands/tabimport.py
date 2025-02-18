from django.core.management.base import BaseCommand
from app.models import Word, Language
import pandas as pd

# Read the .tab file into a DataFrame

class Command(BaseCommand):
    help = 'Import tab file'

    def add_arguments(self, parser):
        parser.add_argument('filepath', type=str)

    def handle(self, *args, **options):
        filepath = str(options['filepath'])

        df = pd.read_csv(filepath, delimiter='\t')

        words = []
        batchsize = 10000

        lang = "pl"
        langname = "Polish"
        pl, created = Language.objects.get_or_create(
            name=langname, abb=lang
        )

        infinitiveTag = "inf"

        currRootForm = ""
        currRootObject = None
        rootExists = False
        infExists = False
        heldRows = []
        heldRoots = []
        for row in df.itertuples():
            if not pd.isna(row.desc):
                desc = row.desc.split("|")
                if "imię" in desc or "nazwisko" in desc:
                    continue
            form = row.form
            lemma = row.lemma
            lemma = lemma.split(':')[0]

            if lemma != currRootForm:
                if rootExists:
                    if infExists:
                        heldRows = heldRows + heldRoots
                        for heldrow in heldRows:
                            w = Word(word_text=heldrow.form, lang=pl, tag=heldrow.tag,
                                    wtype=heldrow.desc, abb=heldrow.abb, 
                                    root=currRootObject)
                            words.append(w)
                    else:
                        # rootrow = heldRoots.pop(0)
                        # currRootObject = Word(word_text=rootrow.form, lang=pl, tag=rootrow.tag,
                        #                         wtype=rootrow.desc, abb=rootrow.abb, 
                        #                         root=None)
                        # currRootObject.save()
                        # heldRows = heldRows + heldRoots
                        # for heldrow in heldRows:
                        #     w = Word(word_text=heldrow.form, lang=pl, tag=heldrow.tag,
                        #             wtype=heldrow.desc, abb=heldrow.abb, 
                        #             root=currRootObject)
                        #     words.append(w)

                        tagMap = {}
                        for heldRoot in heldRoots:
                            rootTag = heldRoot.tag.split(":")[0]
                            if rootTag in tagMap:
                                w = Word(word_text=heldRoot.form, lang=pl, tag=heldRoot.tag,
                                    wtype=heldRoot.desc, abb=heldRoot.abb, 
                                    root=tagMap[rootTag])
                                words.append(w)
                            else:
                                rootw = Word(word_text=heldRoot.form, lang=pl, tag=heldRoot.tag,
                                                       wtype=heldRoot.desc, abb=heldRoot.abb, root=None)
                                rootw.save()
                                tagMap[rootTag] = rootw
                        for heldrow in heldRows:
                            rootTag = heldRoot.tag.split(":")[0]
                            if rootTag in tagMap:
                                w = Word(word_text=heldrow.form, lang=pl, tag=heldrow.tag,
                                    wtype=heldrow.desc, abb=heldrow.abb, 
                                    root=tagMap[rootTag])
                                words.append(w)
                            else:
                                first_key = next(iter(tagMap))
                                w = Word(word_text=heldrow.form, lang=pl, tag=heldrow.tag,
                                    wtype=heldrow.desc, abb=heldrow.abb, 
                                    root=tagMap[first_key])
                                words.append(w)
                    heldRows = []
                    heldRoots = []
                    currRootForm = lemma
                    rootExists = False
                    infExists = False
                    if len(words) > batchsize:
                        Word.objects.bulk_create(words)
                        words = []
                else:
                    heldRows = []
                    currRootForm = lemma
                    rootExists = False
                    infExists = False

            # root
            if form == lemma:
                if row.tag.split(":")[0] == infinitiveTag and not infExists:
                    currRootObject = Word(word_text=form, lang=pl, tag=row.tag,
                                            wtype=row.desc, abb=row.abb, 
                                            root=None)
                    currRootObject.save()
                    infExists = True
                else:
                    heldRoots.append(row)
                rootExists = True
            else:
                heldRows.append(row)
        if words:
            Word.objects.bulk_create(words)

# python manage.py tabimport "data/sgjp-20240929.tab"