'use client';

import { useEffect, useState, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { getCommonWords } from '@/lib/api';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import type { Word } from '@/types/types';
import { getPOSLabel, POS_COLORS } from '@/lib/utils';
import Checkbox from '@/components/Checkbox';

export default function VocabPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: userPrefs, updatePref } = useUserPreferences();

  const [words, setWords] = useState<Word[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchWords = async () => {
      const wordCountParam = searchParams.get('words');
      const wordCount = Number(wordCountParam);

      if (!userPrefs?.language?.id || isNaN(wordCount)) return;

      try {
        const data = await getCommonWords(userPrefs.language.id, wordCount, []);
        setWords(data);
      } catch (error) {
        console.error('Failed to load common words:', error);
      }
    };

    fetchWords();
  }, [searchParams, userPrefs]);

  const handleDelete = () => {
    setWords((prev) => prev.filter((word) => !selectedIds.has(word.id)));
    setSelectedIds(new Set());
  };

  const handleDone = async () => {
    const wordIds = words.map((word) => word.id);
    try {
      await fetch('/api/import-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_ids: wordIds }),
      });

      await updatePref({ setup_complete: true });
      router.push('/videos');
    } catch (error) {
      console.error('Failed to complete import:', error);
    }
  };

  const POS_ORDER = ['verb', 'noun', 'adj', 'adv', 'pron', 'prep', 'part', 'int', 'other'];

  const sortedWords = [...words].sort((a, b) => {
    const posA = getPOSLabel(a.tag);
    const posB = getPOSLabel(b.tag);
    return POS_ORDER.indexOf(posA) - POS_ORDER.indexOf(posB);
  });

  const handleCheckboxChange = (checked: boolean, wordId: number, index: number) => {
    const shiftKey = (window.event as MouseEvent)?.shiftKey;

    setSelectedIds((prev) => {
      const updated = new Set(prev);

      if (checked) {
        if (shiftKey) {
          let startIndex = 0;
          for (let i = index - 1; i >= 0; i--) {
            if (prev.has(sortedWords[i].id)) {
              startIndex = i;
              break;
            }
          }
          for (let i = startIndex; i <= index; i++) {
            updated.add(sortedWords[i].id);
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
    const word = sortedWords[index];
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
    <div className="min-h-screen p-6">
      <div className="w-full max-w-md mx-auto bg-gray-100 rounded-lg shadow max-h-[80vh]">
        <div className="p-4 border-b bg-white sticky top-0 z-10 flex justify-end">
          <button
            onClick={handleDelete}
            disabled={selectedIds.size === 0}
            className={`px-4 py-2 text-sm font-medium rounded ${
              selectedIds.size > 0
                ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Delete
          </button>
        </div>
        <List height={600} itemCount={sortedWords.length} itemSize={48} width="100%">
          {Row}
        </List>
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={handleDone}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
