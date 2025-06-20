'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardList from '@/components/FlashcardList';
import LoadingSpinner from '@/components/LoadingSpinner';
import FlashcardConjugations from '@/components/FlashcardConjugations';
import { getUserWords, getDefinition, saveDefinition, deleteUserWords, getConjugations } from '@/lib/api';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import type { WordCard, TableData } from '@/types/types';

export default function MyVocabPage() {
  const router = useRouter();
  const { data: userPrefs, loading: authLoading } = useUserPreferences();

  const [cards, setCards] = useState<WordCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<WordCard | null>(null);
  const [definition, setDefinition] = useState<string>('');
  const [conjugationData, setConjugationData] = useState<TableData | null>(null);
  const [loadingDef, setLoadingDef] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !userPrefs) {
      router.replace('/login?next=/flashcards');
    }
  }, [authLoading, userPrefs, router]);

  useEffect(() => {
    setCards([]);
    loadWords();
  }, [userPrefs?.vocab_filter]);

  const loadWords = async () => {
    try {
      const words = await getUserWords(userPrefs?.vocab_filter ?? 0);
      setCards(words);
    } catch (err) {
      console.error('Error loading words:', err);
    }
  };

  const handleWordClick = async (card: WordCard) => {
    setSelectedCard(card);
    setLoadingDef(true);
    setError(null);

    try {
      const def = await getDefinition(card.word.id);
      setDefinition(def.text || '');

      const conj = await getConjugations(card.word.id);
      setConjugationData(conj);
    } catch (err) {
      setError('Failed to load definition or conjugation.');
      console.log(err);
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
    } catch {
      alert('Failed to save definition.');
    }
  };

  const handleDeleteWords = async (idsToDelete: number[]) => {
    // Optimistically update UI
    setCards(prev => prev.filter(card => !idsToDelete.includes(card.word.id)));

    // Clear selection if selected card was deleted
    if (selectedCard && idsToDelete.includes(selectedCard.word.id)) {
      setSelectedCard(null);
      setDefinition('');
    }

    try {
      await deleteUserWords(idsToDelete);
    } catch (err) {
      console.error('Failed to delete words:', err);
      alert('Failed to delete some words. Please refresh.');
      loadWords();
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <div className="mr-2 h-full">
        <FlashcardList
          cards={cards}
          onWordClick={handleWordClick}
          selectedWordId={selectedCard?.word?.id}
          onDeleteWords={handleDeleteWords}
        />
      </div>
      <div className="flex-1 bg-white rounded-xl p-6 overflow-auto">
        {selectedCard ? (
          <div>
            <h2 className="text-xl font-semibold mb-2">{selectedCard.word.text}</h2>
            {loadingDef ? (
              <LoadingSpinner size={4} color="text-white" />
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <>
                <div className="max-w-xl w-full mb-4">
                  <textarea
                    className="w-full h-40 p-2 border rounded mb-2"
                    value={definition}
                    onChange={handleDefinitionChange}
                  />
                  <button
                    onClick={handleSaveDefinition}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 hover:cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                {conjugationData ? (
                  <FlashcardConjugations data={conjugationData} />
                ) : null}
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
