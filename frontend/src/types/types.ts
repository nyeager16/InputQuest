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
