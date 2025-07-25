'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { UserPreferences } from '@/context/UserPreferencesContext';
import { useApiWithLogout } from '@/lib/useApiWithLogout';

interface VideoWordTagsProps {
  words: { id: number; text: string }[];
  onWordAdded: (id: number) => void;
  userPrefs: UserPreferences | null;
}

export default function VideoWordTags({ words, onWordAdded, userPrefs }: VideoWordTagsProps) {
  const api = useApiWithLogout();
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  if (!words.length) return null;

  const handleWordClick = (id: number) => {
    setSelectedWordId((prev) => (prev === id ? null : id));
  };

  const handleAddWord = async () => {
    if (selectedWordId === null) return;

    onWordAdded(selectedWordId);
    setSelectedWordId(null);
    setLoading(true);

    try {
      await api.addUserWords([selectedWordId]);
    } catch (error) {
      console.error('Failed to add word:', error);
      alert('Error adding word');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="border-t border-gray-500 pt-4">
        <h3 className="text-base font-medium text-center text-gray-800 mb-4">
          New Words
        </h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {words.map((word) => (
            <span
              key={word.id}
              onClick={() => handleWordClick(word.id)}
              className={`px-3 py-1 rounded text-sm font-medium select-text cursor-pointer transition-colors ${
                selectedWordId === word.id
                  ? 'bg-teal-700 text-white'
                  : 'bg-[#e0f7fa] text-[#00695c] hover:bg-[#b2ebf2]'
              }`}
            >
              {word.text}
            </span>
          ))}
        </div>
        <div className="flex justify-center mt-4 flex-wrap gap-2">
          <button
            onClick={handleAddWord}
            disabled={!userPrefs || loading || selectedWordId === null}
            className={`px-4 py-2 text-sm font-medium rounded transition ${
              userPrefs && selectedWordId !== null
                ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {loading && userPrefs && selectedWordId !== null
              ? 'Adding...'
              : userPrefs
              ? 'Add Word'
              : 'Log in to Add Words'}
          </button>

          <Link
            href={selectedWordId !== null ? `/learn?search=${selectedWordId}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-2 text-sm font-medium rounded transition ${
              selectedWordId !== null
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed pointer-events-none'
            }`}
          >
            Learn
          </Link>
        </div>
        <div className="border-t border-gray-500 mt-4" />
      </div>
    </div>
  );
}
