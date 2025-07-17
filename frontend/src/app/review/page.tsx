'use client';

import { useRouter } from 'next/navigation';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { useEffect, useState, useCallback } from 'react';
import { getUserReviews, submitReview } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';

type Flashcard = {
  id: number;
  word_id: number;
  word__text: string;
  definition: string;
};

export default function ReviewPage() {
  const { data: userPrefs, loading: authLoading } = useUserPreferences();
  const router = useRouter();

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !userPrefs) {
      router.replace('/login?next=/review');
    }
  }, [authLoading, userPrefs, router]);

  useEffect(() => {
    async function fetchFlashcards() {
      try {
        const data = await getUserReviews();
        setFlashcards(data.words);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchFlashcards();
  }, []);

  const handleAnswer = useCallback((correct: boolean) => {
    const current = flashcards[currentIndex];
    const rating = correct ? 1 : 0;
  
    // Advance flashcard immediately
    setShowAnswer(false);
    setCurrentIndex((prev) => prev + 1);
  
    // Submit in background
    submitReview(current.id, rating).catch((error) => {
      console.error('Failed to submit review:', error);
    });
  }, [flashcards, currentIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ' && !showAnswer) {
      e.preventDefault();
      setShowAnswer(true);
    } else if (showAnswer && (e.key === '1' || e.key === '2')) {
      handleAnswer(e.key === '2');
    }
  }, [showAnswer, handleAnswer]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size={36} color="text-black" />
      </div>
    );
  
  if (currentIndex >= flashcards.length) return <div className="p-4 text-center">New flashcards will appear when they are due</div>;

  const card = flashcards[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md border shadow-lg p-6 text-center bg-white">
        <div className="text-2xl font-bold mb-4">{card.word__text}</div>

        {showAnswer ? (
          <div className="text-lg text-gray-700 mb-6">{card.definition}</div>
        ) : (
          <button
            onClick={() => setShowAnswer(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer"
          >
            Show Answer (Space)
          </button>
        )}

        {showAnswer && (
          <div className="flex justify-around mt-4 space-x-4">
            <button
              onClick={() => handleAnswer(false)}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 cursor-pointer"
            >
              Incorrect (1)
            </button>
            <button
              onClick={() => handleAnswer(true)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 cursor-pointer"
            >
              Correct (2)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
