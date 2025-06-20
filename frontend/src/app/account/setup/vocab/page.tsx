'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCommonWords } from '@/lib/api';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import type { Word } from '@/types/types';
import VocabImportList from '@/components/VocabImportList';

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
      // Placeholder API call — replace with real one
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

  return (
    <div className="min-h-screen p-6">
      <VocabImportList
        words={words}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        onDelete={handleDelete}
      />

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
