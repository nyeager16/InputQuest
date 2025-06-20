from .models import (
    Language, Word, WordInstance, UserWord, UserVideo, Video, 
    Question, Sentence, Feedback, WordSet, WordSetVideoScore
)
from django.db import transaction
from django.conf import settings
from openai import OpenAI
import hashlib

def get_common_words(language, exclude_ids=None, count=1000):
    if exclude_ids is None:
        exclude_ids = []

    words = (
        Word.objects
        .filter(language=language, root=None, instance_count__gt=0)
        .exclude(id__in=exclude_ids)
        .order_by('-instance_count')[:count]
    )
    return words

def get_video_scores_for_wordset(word_ids: set) -> list[tuple[int, int]]:
    if not word_ids:
        return []

    # Create the same hash used during storage
    sorted_ids = sorted(word_ids)
    hash_input = ",".join(map(str, sorted_ids)).encode('utf-8')
    wordset_hash = hashlib.sha256(hash_input).hexdigest()

    try:
        word_set = WordSet.objects.get(hash=wordset_hash)
    except WordSet.DoesNotExist:
        return []

    # Retrieve and return (video_id, score) tuples
    return list(
        WordSetVideoScore.objects
        .filter(word_set=word_set)
        .values_list('video_id', 'score')
    )

def store_wordset_video_scores(word_ids: set, video_scores: list[tuple[int, int]]):
    if not word_ids or not video_scores:
        raise ValueError("Both word_ids and video_score_list must be non-empty.")

    # Sort the word_ids to ensure consistent hashing
    sorted_ids = sorted(word_ids)
    hash_input = ",".join(map(str, sorted_ids)).encode('utf-8')
    wordset_hash = hashlib.sha256(hash_input).hexdigest()

    with transaction.atomic():
        # Get or create the WordSet
        word_set, created = WordSet.objects.get_or_create(hash=wordset_hash)
        if created:
            word_set.words.set(sorted_ids)

        # Prepare the video score objects
        video_score_objects = []
        for video_id, score in video_scores:
            video_score_objects.append(WordSetVideoScore(
                word_set=word_set,
                video_id=video_id,
                score=score
            ))

        # Avoid duplicates
        WordSetVideoScore.objects.filter(word_set=word_set).delete()

        # Bulk create new ones
        WordSetVideoScore.objects.bulk_create(video_score_objects)
        return word_set

def generate_video_score_list(word_ids):
    # Get all words whose root is in the target set
    related_root_word_ids = set(
        Word.objects.filter(root_id__in=word_ids).values_list('id', flat=True)
    )

    all_matched_ids = word_ids | related_root_word_ids

    video_scores = []

    for video in Video.objects.all():
        word_instances = WordInstance.objects.filter(video=video)

        total_instances = word_instances.count()
        if total_instances == 0:
            score = 0
        else:
            matched_count = word_instances.filter(word_id__in=all_matched_ids).count()
            score = round((matched_count / total_instances) * 100)

        video_scores.append((video.id, score))

    return video_scores

def populate_user_video_scores(user_id, language_id, word_set):
    # Get all videos filtered by language
    videos = Video.objects.filter(language_id=language_id)

    # Get all WordSetVideoScore entries for the word_set and these videos
    wsvs_qs = WordSetVideoScore.objects.filter(
        word_set=word_set,
        video__in=videos
    ).select_related('video')

    # Map video_id -> score for quick lookup
    video_score_map = {wsvs.video_id: wsvs.score for wsvs in wsvs_qs}

    # Get existing UserVideo for this user and those videos (avoid duplicates)
    existing_uv_qs = UserVideo.objects.filter(user_id=user_id, video__in=videos)
    existing_uv_map = {uv.video_id: uv for uv in existing_uv_qs}

    # Prepare lists for bulk_create and bulk_update
    to_create = []
    to_update = []

    for video in videos:
        score = video_score_map.get(video.id, 0)
        if video.id in existing_uv_map:
            # Update existing UserVideo if score differs
            uv = existing_uv_map[video.id]
            if uv.score != score:
                uv.score = score
                to_update.append(uv)
        else:
            # Create new UserVideo
            to_create.append(UserVideo(user_id=user_id, video_id=video.id, score=score))

    with transaction.atomic():
        if to_create:
            UserVideo.objects.bulk_create(to_create, batch_size=500)
        if to_update:
            UserVideo.objects.bulk_update(to_update, ['score'], batch_size=500)

def generate_question(sentences, language):
    question_count = Question.objects.count()
    if question_count > 500:
        return "Maximum sitewide questions reached. The limit will increase once this feature exits beta."
    
    client = OpenAI(
        api_key=settings.OPENAI_API_KEY
    )

    prompt = f"In 1 sentence, generate a listening comprehension question based on the following sentence(s) in {language}:\n\n{sentences}"
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": "You are a helpful assistant that creates listening comprehension questions."
                    }
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    )

    return response.choices[0].message.content

def create_questions(video, min_time=30, min_sentences=5, max_questions=2):
    sentences = list(Sentence.objects.filter(video=video).order_by("start"))
    if not sentences:
        return
    
    total_start = sentences[0].start
    total_end = sentences[-1].end
    total_duration = total_end - total_start
    chunk_duration = total_duration // max_questions

    used_sentence_indices = set()
    question_objects = []

    for q_idx in range(max_questions):
        chunk_start_time = total_start + q_idx * chunk_duration
        chunk_end_time = chunk_start_time + chunk_duration
        chunk_sentences = [s for s in sentences if s.start >= chunk_start_time and s.end <= chunk_end_time]

        # Slide through chunk_sentences to find a valid window
        for i in range(len(chunk_sentences) - min_sentences + 1):
            window = chunk_sentences[i:i + min_sentences]
            window_start = window[0].start
            window_end = window[-1].end
            window_duration = window_end - window_start

            if window_duration >= min_time:
                # Make sure sentences are not reused
                window_ids = tuple(id(s) for s in window)
                if any(idx in used_sentence_indices for idx in window_ids):
                    continue

                # Join text and generate question
                joined_text = " ".join(s.text for s in window)
                question_text = generate_question(joined_text, video.language.name)

                question_objects.append(Question(
                    video=video,
                    text=question_text,
                    start=window_start,
                    end=window_end
                ))

                # Mark sentences as used
                used_sentence_indices.update(window_ids)
                break
    Question.objects.bulk_create(question_objects)
    return question_objects

def generate_feedback(answers, total_text, user):
    if Feedback.objects.count() >= 200:
        return {str(question_id): "Maximum sitewide feedback reached. The limit will increase once this feature exits beta." for question_id in data.keys()}
    feedback_dict = {}
    feedback_objects = []

    client = OpenAI(
        api_key=settings.OPENAI_API_KEY
    )

    for answer in answers:
        question = answer.question

        prompt = f"""
            Text: "{total_text}"

            Question: "{question.text}"

            Answer: "{answer.text}"

            Instruction: 
            - Provide feedback in **English** on the answer's grammar and spelling in 1-3 sentences.
            - Provide a **sample answer** in the **question's language** using the provided answer as a guide. The sample should be 1 sentence long.
            - Make sure to follow the format: "feedback \n example"
            """
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": "You are a helpful assistant that provides concise feedback in a natural way like an instructor speaking."
                        }
                    ]
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ],
            model="gpt-4o-mini",
        )
        feedback_text = response.choices[0].message.content
        feedback_dict[str(question.id)] = feedback_text

        feedback_objects.append(Feedback(answer=answer, user=user, text=feedback_text))
    if feedback_objects:
        Feedback.objects.bulk_create(feedback_objects)
    return feedback_dict

def get_conjugation_table(word, user):
    user_words = set()
    if user:
        user_words = set(
            UserWord.objects.filter(user=user, needs_review=True, word__root__isnull=False)
            .values_list('word__id', flat=True)
        )

    split_tag = word.tag.split(":")
    table_type = -1
    data = {}

    # VERB
    if split_tag[0] == "inf":
        table_type = 0
        child_words = Word.objects.filter(root=word)
        verb_table = {
            "present": {p: {"sg": {}, "pl": {}} for p in ["1p", "2p", "3p"]},
            "past": {p: {g: {} for g in ["m", "f", "n", "mpl", "opl"]} for p in ["1p", "2p", "3p"]}
        }

        person_map = {"pri": "1p", "sec": "2p", "ter": "3p"}

        for w in child_words:
            tag = w.tag
            is_user = w.id in user_words

            # Present
            if tag in ["fin:sg:pri:imperf", "fin:sg:pri:perf"]:
                verb_table["present"]["1p"]["sg"] = {"id": w.id, "text": w.text, "needs_review": is_user}
            elif tag in ["fin:pl:pri:imperf", "fin:pl:pri:perf"]:
                verb_table["present"]["1p"]["pl"] = {"id": w.id, "text": w.text, "needs_review": is_user}
            elif tag in ["fin:sg:sec:imperf", "fin:sg:sec:perf"]:
                verb_table["present"]["2p"]["sg"] = {"id": w.id, "text": w.text, "needs_review": is_user}
            elif tag in ["fin:pl:sec:imperf", "fin:pl:sec:perf"]:
                verb_table["present"]["2p"]["pl"] = {"id": w.id, "text": w.text, "needs_review": is_user}
            elif tag in ["fin:sg:ter:imperf", "fin:sg:ter:perf"]:
                verb_table["present"]["3p"]["sg"] = {"id": w.id, "text": w.text, "needs_review": is_user}
            elif tag in ["fin:pl:ter:imperf", "fin:pl:ter:perf"]:
                verb_table["present"]["3p"]["pl"] = {"id": w.id, "text": w.text, "needs_review": is_user}

            # Past
            parts = tag.split(":")
            if len(parts) >= 4 and parts[0] == "praet":
                person = person_map.get(parts[3])
                number = parts[1]
                gender = parts[2]

                if not person:
                    continue
                if number == "sg":
                    if "m" in gender:
                        verb_table["past"][person]["m"] = {"id": w.id, "text": w.text, "needs_review": is_user}
                    elif gender == "f":
                        verb_table["past"][person]["f"] = {"id": w.id, "text": w.text, "needs_review": is_user}
                    elif gender == "n":
                        verb_table["past"][person]["n"] = {"id": w.id, "text": w.text, "needs_review": is_user}
                elif number == "pl":
                    if "m" in gender and "f" not in gender:
                        verb_table["past"][person]["mpl"] = {"id": w.id, "text": w.text, "needs_review": is_user}
                    elif "m" in gender and "f" in gender:
                        verb_table["past"][person]["opl"] = {"id": w.id, "text": w.text, "needs_review": is_user}

        data = {"verb": verb_table}

    # NOUN
    elif split_tag[0] == "subst":
        table_type = 1
        child_words = list(Word.objects.filter(root=word)) + [word]
        noun_table = {case: {"sg": {}, "pl": {}} for case in ["nom", "gen", "dat", "acc", "inst", "loc", "voc"]}

        for w in child_words:
            parts = w.tag.split(":")
            if len(parts) < 3:
                continue
            number = parts[1]
            if number not in ["sg", "pl"]:
                continue

            for case in parts[2].split("."):
                if case in noun_table:
                    noun_table[case][number] = {
                        "id": w.id,
                        "text": w.text,
                        "needs_review": w.id in user_words
                    }

        data = {"noun": noun_table}

    # ADJECTIVE
    elif split_tag[0] == "adj":
        table_type = 2
        child_words = list(Word.objects.filter(root=word)) + [word]

        col_map = {
            "nom": ["m", "n", "f", "mpl", "opl"],
            "gen": ["mf", "f", "pl"],
            "dat": ["mf", "f", "pl"],
            "acc": ["m", "n", "f", "mpl", "opl"],
            "inst": ["mf", "f", "pl"],
            "loc": ["mf", "f", "pl"],
            "voc": ["m", "n", "f", "mpl", "opl"]
        }
        adj_table = {case: {col: {} for col in cols} for case, cols in col_map.items()}

        def normalize_gender_tags(tags):
            out = set()
            for g in tags:
                if g.startswith("m"):
                    out.add("m")
                elif g.startswith("f"):
                    out.add("f")
                elif g.startswith("n"):
                    out.add("n")
            return list(out)

        for w in child_words:
            parts = w.tag.split(":")
            if len(parts) < 4 or parts[0] != "adj":
                continue
            if parts[-1] != "pos":
                continue

            number = parts[1]
            cases_in_tag = parts[2].split(".")
            genders = normalize_gender_tags(parts[3].split("."))
            is_user = w.id in user_words

            for case in cases_in_tag:
                if case not in adj_table:
                    continue

                if case in ["gen", "dat", "inst", "loc"]:
                    if number == "sg":
                        if ("m" in genders or "n" in genders) and not adj_table[case]["mf"]:
                            adj_table[case]["mf"] = {"id": w.id, "text": w.text, "needs_review": is_user}
                        if "f" in genders and not adj_table[case]["f"]:
                            adj_table[case]["f"] = {"id": w.id, "text": w.text, "needs_review": is_user}
                    elif number == "pl" and not adj_table[case]["pl"]:
                        adj_table[case]["pl"] = {"id": w.id, "text": w.text, "needs_review": is_user}
                else:
                    if number == "sg":
                        if "m" in genders and not adj_table[case]["m"]:
                            adj_table[case]["m"] = {"id": w.id, "text": w.text, "needs_review": is_user}
                        if "n" in genders and not adj_table[case]["n"]:
                            adj_table[case]["n"] = {"id": w.id, "text": w.text, "needs_review": is_user}
                        if "f" in genders and not adj_table[case]["f"]:
                            adj_table[case]["f"] = {"id": w.id, "text": w.text, "needs_review": is_user}
                    elif number == "pl":
                        if "m" in genders and "f" not in genders and not adj_table[case]["mpl"]:
                            adj_table[case]["mpl"] = {"id": w.id, "text": w.text, "needs_review": is_user}
                        elif not adj_table[case]["opl"]:
                            adj_table[case]["opl"] = {"id": w.id, "text": w.text, "needs_review": is_user}

        data = {"adjective": adj_table}

    return {
        "table_type": table_type,
        "conjugation_table": data
    }
