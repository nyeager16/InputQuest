'use client';

import React, { useState } from 'react';
import Checkbox from '@/components/Checkbox';
import { useUserPreferences } from '@/context/UserPreferencesContext';

type WordCard = {
  word: {
    id: number;
    text: string;
  };
  data: Record<string, any>;
};

type FlashcardListProps = {
  cards?: WordCard[];
  onWordClick: (card: WordCard) => void;
  selectedWordId?: number;
  onDeleteWords?: (ids: number[]) => void;
};

const FlashcardList: React.FC<FlashcardListProps> = ({
  cards = [],
  onWordClick,
  selectedWordId,
  onDeleteWords,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: userPrefs, updatePref } = useUserPreferences();

  const toggleEditMode = () => {
    setEditMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const handleCheckboxChange = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      if (checked) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    onDeleteWords?.(Array.from(selectedIds));
    setSelectedIds(new Set());
    setEditMode(false);
  };

  const handleToggleFilter = async () => {
    if (!userPrefs) return;
    const newFilter = userPrefs.vocab_filter === 0 ? 1 : 0;
    try {
      await updatePref({ vocab_filter: newFilter });
    } catch (error) {
      console.error('Failed to toggle filter:', error);
    }
  };

  return (
    <div className="w-64 h-full overflow-y-auto p-2 bg-gray-100">
      <div className="flex justify-between items-center mb-2 gap-2">
        <button
          className="text-sm text-white bg-blue-500 px-3 py-1 rounded hover:bg-blue-600"
          onClick={toggleEditMode}
        >
          {editMode ? 'Cancel' : 'Edit'}
        </button>

        <button
          className="text-sm text-white bg-green-500 px-3 py-1 rounded hover:bg-green-600"
          onClick={handleToggleFilter}
        >
          {userPrefs?.vocab_filter === 0 ? 'A→Z' : 'Recent'}
        </button>

        <button
          className={`text-sm px-3 py-1 rounded ${
            selectedIds.size > 0
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
          onClick={handleDelete}
          disabled={selectedIds.size === 0}
        >
          Delete
        </button>
      </div>

      {cards.map((card, index) => (
        <div
          key={index}
          className={`flex items-center justify-between px-3 py-2 text-sm border-b ${
            selectedWordId === card.word.id
              ? 'bg-blue-200 font-semibold'
              : 'bg-white hover:bg-blue-100'
          }`}
          onClick={() => !editMode && onWordClick(card)}
        >
          <span>{card.word.text}</span>
          {editMode && (
            <Checkbox
              checked={selectedIds.has(card.word.id)}
              onChange={(checked) => handleCheckboxChange(card.word.id, checked)}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default FlashcardList;
