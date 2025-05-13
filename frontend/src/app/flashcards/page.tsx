'use client';

import { useEffect, useState } from 'react';
import FlashcardList from '@/components/FlashcardList';
import { getUserWords, getDefinition, saveDefinition } from '@/lib/api';

export default function HomePage() {
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [definition, setDefinition] = useState<string>('');
  const [loadingDef, setLoadingDef] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserWords()
      .then(setCards)
      .catch(err => console.error('Error loading words:', err));
  }, []);

  const handleWordClick = async (card: any) => {
    setSelectedCard(card);
    setLoadingDef(true);
    setError(null);

    try {
      const def = await getDefinition(card.word.id);
      setDefinition(def.text || '');
    } catch (err) {
      setError('Failed to load definition.');
    } finally {
      setLoadingDef(false);
    }
  };

  const handleDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDefinition(e.target.value);
  };

  const handleSaveDefinition = async () => {
    if (!selectedCard) return;

    try {
      await saveDefinition(selectedCard.word.id, definition);
      alert('Definition saved.');
    } catch {
      alert('Failed to save definition.');
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <div className="mr-6 h-full">
        <FlashcardList
          cards={cards}
          onWordClick={handleWordClick}
          selectedWordId={selectedCard?.word?.id}
        />
      </div>
      <div className="flex-1 bg-white rounded-xl shadow p-6 overflow-auto">
        {selectedCard ? (
          <div>
            <h2 className="text-xl font-semibold mb-2">{selectedCard.word.text}</h2>
            {loadingDef ? (
              <p>Loading definition...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <>
                <div className="max-w-xl w-full">
                  <textarea
                    className="w-full h-40 p-2 border rounded mb-4"
                    value={definition}
                    onChange={handleDefinitionChange}
                  />
                  <button
                    onClick={handleSaveDefinition}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 hover:cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <p>Select a word from the left to get started.</p>
        )}
      </div>
    </div>
  );
}
