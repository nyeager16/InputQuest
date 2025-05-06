'use client';

import { useEffect, useState } from 'react';
import FlashcardList from '@/components/FlashcardList';
import { getUserWords } from '@/lib/api';

export default function HomePage() {
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    getUserWords()
      .then(setCards)
      .catch(err => console.error('Error loading words:', err));
  }, []);

  const handleWordClick = (card: any) => {
    console.log('Clicked:', card);
  };

  return (
    <div className="flex h-screen p-6">
      <div className="mr-6">
        <FlashcardList cards={cards} onWordClick={handleWordClick} />
      </div>
      <div className="flex-1 bg-white rounded-xl shadow p-6">
        <p>Select a word from the left to get started.</p>
      </div>
    </div>
  );
}
