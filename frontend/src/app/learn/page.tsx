'use client';

import { useEffect, useState } from 'react';
import { getCommonWords, getUserWordIds, addUserWord } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Checkbox from '@/components/Checkbox';
import { useUserPreferences } from '@/context/UserPreferencesContext';

type Word = {
  id: number;
  text: string;
};

const CommonWordsPage = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [addedWords, setAddedWords] = useState<Set<number>>(new Set());
  const [hideAdded, setHideAdded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { data: userPrefs, updatePref } = useUserPreferences();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [commonWords, userWordIds] = await Promise.all([
          getCommonWords(),
          getUserWordIds().catch(() => []),
        ]);

        setWords(commonWords);
        setAddedWords(new Set(userWordIds));
      } catch (err) {
        setError('Failed to load words');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Initialize hideAdded from user preferences when available
  useEffect(() => {
    if (userPrefs && typeof userPrefs.learn_hide_vocab === 'boolean') {
      setHideAdded(userPrefs.learn_hide_vocab);
    }
  }, [userPrefs]);

  const handleAdd = async (wordId: number) => {
    try {
      await addUserWord(wordId);
      setAddedWords((prev) => new Set(prev).add(wordId));
    } catch (err) {
      alert('Failed to add word');
    }
  };

  const handleToggleHide = () => {
    const newValue = !hideAdded;
    setHideAdded(newValue);
    updatePref?.({ learn_hide_vocab: newValue });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  const filteredWords = hideAdded
    ? words.filter((word) => !addedWords.has(word.id))
    : words;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-3xl">
        <div className="mb-4">
          <Checkbox
            id="hide-added"
            label="Hide My Vocab"
            checked={hideAdded}
            onChange={handleToggleHide}
          />
        </div>

        <h1 className="text-2xl font-bold mb-4">Common Words</h1>
        <ol>
          {filteredWords.map((word) => {
            const isAdded = addedWords.has(word.id);
            return (
              <li
                key={word.id}
                className="border-t border-b border-black px-4 py-2 flex justify-between items-center"
              >
                <span>{word.text}</span>
                <div className="space-x-2">
                  <button
                    onClick={() => router.push(`/learn/${word.text}`)}
                    className="bg-blue-500 text-white px-3 py-1 text-sm hover:bg-blue-600 cursor-pointer rounded-sm transition-colors duration-300"
                  >
                    Learn
                  </button>
                  <button
                    onClick={() => handleAdd(word.id)}
                    disabled={isAdded}
                    className={`px-3 py-1 text-sm text-white 
                      ${isAdded
                        ? 'bg-gray-400 cursor-default'
                        : 'bg-green-500 hover:bg-green-600 cursor-pointer'}
                      rounded-sm transition-colors duration-300`}
                  >
                    Add
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default CommonWordsPage;
