export type Word = {
  id: number;
  text: string;
  tag: string;
  ipa: string;
};

export type WordReviewData = {
  due: string;
  step: number;
  state: number;
  card_id: number;
  stability: number | null;
  difficulty: number | null;
  last_review: string | null;
};

export type WordCard = {
  word: Word;
  data: WordReviewData;
  id: number;
  needs_review: boolean;
};

export type FlashcardListProps = {
  cards?: WordCard[];
  onWordClick: (card: WordCard) => void;
  selectedWordId?: number;
  onDeleteWords?: (ids: number[]) => void;
};

export interface FormEntry {
  id: number;
  text: string;
  needs_review: boolean;
}

export type VerbPresent = Record<'1p' | '2p' | '3p', Record<'sg' | 'pl', FormEntry>>;
export type VerbPast = Record<'1p' | '2p' | '3p', Record<'m' | 'f' | 'n' | 'mpl' | 'opl', FormEntry>>;

export type VerbTable = {
  present: VerbPresent;
  past: VerbPast;
};

export type NounTable = Record<
  'nom' | 'gen' | 'dat' | 'acc' | 'inst' | 'loc' | 'voc',
  Record<'sg' | 'pl', FormEntry>
>;

export type AdjTable = Record<
  'nom' | 'gen' | 'dat' | 'acc' | 'inst' | 'loc' | 'voc',
  Record<'m' | 'n' | 'f' | 'mpl' | 'opl' | 'mf' | 'pl', FormEntry>
>;

export type TableData = {
  table_type: number;
  conjugation_table: {
    noun?: NounTable;
    verb?: VerbTable;
    adjective?: AdjTable;
  };
};

export type ConjugationCache = {
  [wordId: number]: TableData;
};

export type LearnInstance = {
  start: number;
  word__text: string;
};

export type LearnData = {
  definition: string;
  video_url: string;
  instances: LearnInstance[];
};

export type Language = {
  id: number;
  name: string;
  abb: string;
};

export type WordGroup = {
  label: string;
  words: Word[];
};

export type FlattenedItem =
  | { type: 'header'; label: string; groupIndex: number }
  | {
      type: 'word';
      word: Word;
      groupIndex: number;
      wordIndex: number;
    };

export type AnswerSubmission = {
  video_id: number;
  answers: {
    question_id: number;
    text: string;
  }[];
};

export type UserPreferences = {
  id: number;
  language: { id: number; name: string; abb: string };
  comprehension_level_min: number;
  comprehension_level_max: number;
  queue_CI: number;
  desired_retention: number;
  fsrs: boolean;
  vocab_filter: number;
  max_clip_length: number;
  learn_hide_vocab: boolean;
  grid_view: boolean;
  user: number;
  word_set: number;
  left_width_percent: number;
  setup_complete: boolean;
};