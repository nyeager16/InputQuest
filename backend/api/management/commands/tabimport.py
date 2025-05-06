from django.core.management.base import BaseCommand
from api.models import Word, Language
from collections import defaultdict
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
                            w = Word(text=heldrow.form, language=pl, tag=heldrow.tag,
                                    wtype=heldrow.desc, abb=heldrow.abb, 
                                    root=currRootObject)
                            words.append(w)
                    else:
                        tagMap = {}
                        for heldRoot in heldRoots:
                            rootTag = heldRoot.tag.split(":")[0]
                            if rootTag in tagMap:
                                heldRows.append(heldRoot)
                            else:
                                rootw = Word(text=heldRoot.form, language=pl, tag=heldRoot.tag,
                                                       wtype=heldRoot.desc, abb=heldRoot.abb, root=None)
                                tagMap[rootTag] = heldRoot
                        
                        tagCount = defaultdict(int)
                        for heldrow in heldRows:
                            rootTag = heldrow.tag.split(":")[0]
                            if rootTag in tagMap:
                                tagCount[rootTag] += 1
                        if tagCount:
                            max_tag = max(tagCount, key=tagCount.get)
                            root_word = tagMap.pop(max_tag)
                        else:
                            first_key = next(iter(tagMap))
                            root_word = tagMap.pop(first_key)
                        rootw = Word(text=root_word.form, language=pl, tag=root_word.tag,
                                        wtype=root_word.desc, abb=root_word.abb, root=None)
                        rootw.save()
                        for key, value in tagMap.items():
                            w = Word(text=value.form, language=pl, tag=value.tag,
                                wtype=value.desc, abb=value.abb, 
                                root=rootw)
                            words.append(w)
                        for heldrow in heldRows:
                            w = Word(text=heldrow.form, language=pl, tag=heldrow.tag,
                                wtype=heldrow.desc, abb=heldrow.abb, 
                                root=rootw)
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
                    currRootObject = Word(text=form, language=pl, tag=row.tag,
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