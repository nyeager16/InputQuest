'use client';

import { useEffect, useState, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { getCommonWords, addUserWords } from '@/lib/api';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import type { Word } from '@/types/types';
import { getPOSLabel, POS_COLORS } from '@/lib/utils';
import Checkbox from '@/components/Checkbox';

type WordGroup = {
  label: string;
  words: Word[];
};

type FlattenedItem =
  | { type: 'header'; label: string; groupIndex: number }
  | {
      type: 'word';
      word: Word;
      groupIndex: number;
      wordIndex: number;
    };

const POS_ORDER = ['verb', 'noun', 'adj', 'adv', 'pron', 'prep', 'part', 'int', 'other'];

export default function VocabPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: userPrefs, updatePref } = useUserPreferences();

  const [wordGroups, setWordGroups] = useState<WordGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [customWords, setCustomWords] = useState('100');
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const flattenWords: FlattenedItem[] = wordGroups.flatMap((group, groupIndex) => {
    const header = [{ type: 'header', label: group.label, groupIndex }] as const;

    const sorted = [...group.words].sort((a, b) => {
      const posA = getPOSLabel(a.tag);
      const posB = getPOSLabel(b.tag);
      return POS_ORDER.indexOf(posA) - POS_ORDER.indexOf(posB);
    });

    const words = sorted.map((word, wordIndex) => ({
      type: 'word' as const,
      word,
      groupIndex,
      wordIndex,
    }));

    return [...header, ...words];
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const fetchWords = async () => {
      const wordCountParam = searchParams.get('words');
      const wordCount = Number(wordCountParam);
      if (!userPrefs?.language?.id || isNaN(wordCount)) return;

      try {
        const data = await getCommonWords(userPrefs.language.id, wordCount, []);
        setWordGroups([{ label: `Initial Batch: ${data.length} words`, words: data }]);
      } catch (error) {
        console.error('Failed to load words:', error);
      }
    };
    fetchWords();
  }, [searchParams, userPrefs]);

  const handleAddWords = async () => {
    const count = Number(customWords);
    if (!userPrefs?.language?.id || isNaN(count) || count <= 0) return;
    try {
      const existingIds = wordGroups.flatMap((group) => group.words.map((w) => w.id));
      console.log(existingIds);
      const data = await getCommonWords(userPrefs.language.id, count, existingIds);
      setWordGroups((prev) => [
        { label: `Added Batch: ${data.length} words`, words: data },
        ...prev,
      ]);
    } catch (error) {
      console.error('Failed to fetch additional words:', error);
    }
  };

  const handleDelete = () => {
    setWordGroups((prevGroups) =>
      prevGroups.map((group) => ({
        ...group,
        words: group.words.filter((word) => !selectedIds.has(word.id)),
      }))
    );
    setSelectedIds(new Set());
  };

  const handleDone = async () => {
    const allWordIds = wordGroups.flatMap((group) => group.words.map((word) => word.id));
    try {
      await addUserWords(allWordIds);
      await updatePref({ setup_complete: true });
      router.push('/videos');
    } catch (error) {
      console.error('Failed to complete import:', error);
    }
  };

  const handleCheckboxChange = (
    checked: boolean,
    wordId: number,
    index: number
  ) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);

      if (checked) {
        if (isShiftPressed) {
          let startIndex = 0;

          for (let i = index - 1; i >= 0; i--) {
            const item = flattenWords[i];
            if (item.type === 'word' && selectedIds.has(item.word.id)) {
              startIndex = i;
              break;
            }
          }

          for (let i = startIndex; i <= index; i++) {
            const item = flattenWords[i];
            if (item.type === 'word') {
              updated.add(item.word.id);
            }
          }
        } else {
          updated.add(wordId);
        }
      } else {
        updated.delete(wordId);
      }

      return updated;
    });
  };

  const RowComponent = ({ index, style }: ListChildComponentProps) => {
    const item = flattenWords[index];

    if (item.type === 'header') {
      return (
        <div
          style={style}
          className="bg-gray-100 font-semibold text-xs text-gray-700 px-4 py-2 border-b sticky top-0 z-0"
        >
          {item.label}
        </div>
      );
    }

    const word = item.word;
    const posLabel = getPOSLabel(word.tag);
    const posColor = POS_COLORS[posLabel] || 'bg-gray-500';

    return (
      <div
        style={style}
        key={word.id}
        className="px-4 py-2 border-b bg-white text-sm flex items-center gap-3"
      >
        <span
          className={`text-xs font-semibold w-16 text-center py-1 rounded text-white ${posColor}`}
        >
          {posLabel}
        </span>
        <span className="text-sm font-medium">{word.text}</span>
        <div className="ml-auto">
          <Checkbox
            checked={selectedIds.has(word.id)}
            onChange={(checked) => handleCheckboxChange(checked, word.id, index)}
            id={`checkbox-${word.id}`}
          />
        </div>
      </div>
    );
  };

  const Row = memo(RowComponent);
  Row.displayName = 'VocabImportRow';

  return (
    <div className="min-h-screen flex flex-row">
      {/* LEFT PANEL: Word List */}
      <div className="w-[400px] border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b bg-white sticky top-0 z-10 flex justify-end">
          <button
            onClick={handleDelete}
            disabled={selectedIds.size === 0}
            className={`px-3 py-2 text-sm font-medium rounded ${
              selectedIds.size > 0
                ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Delete
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={flattenWords.length}
                itemSize={40}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        </div>
      </div>

      {/* RIGHT PANEL: Actions */}
      <div className="flex-1 flex items-center px-6">
        <div className="flex flex-col gap-6">
          {/* Placeholder Search Bar */}
          <input
            type="text"
            placeholder="Search (coming soon)"
            className="border rounded px-4 py-2 w-64 text-sm"
            disabled
          />

          {/* Add More Words */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={customWords}
              onChange={(e) => setCustomWords(e.target.value)}
              onBlur={(e) => {
                const value = Number(e.target.value);
                const min = 0;
                const max = 9999;
                if (value < min) {
                  setCustomWords(min.toString());
                } else if (value > max) {
                  setCustomWords(max.toString());
                }
              }}
              placeholder="Enter word count"
              className="border rounded px-3 py-2 w-48 text-sm"
              min={0}
              max={9999}
            />
            <button
              onClick={handleAddWords}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition cursor-pointer"
            >
              Add
            </button>
          </div>

          {/* Done Button */}
          <button
            onClick={handleDone}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
