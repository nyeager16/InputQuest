'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Checkbox from '@/components/Checkbox';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import type { FlashcardListProps } from '@/types/types';

const FlashcardList: React.FC<FlashcardListProps> = ({
  cards = [],
  onWordClick,
  selectedWordId,
  onDeleteWords,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const { data: userPrefs, updatePref } = useUserPreferences();

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

  const toggleEditMode = () => {
    setEditMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const handleCheckboxChange = (id: number, checked: boolean, index: number) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);

      if (isShiftPressed && checked) {
        // Find the nearest checked item above the current one
        let anchorIndex = -1;
        for (let i = index - 1; i >= 0; i--) {
          const wordId = cards[i].word.id;
          if (prev.has(wordId)) {
            anchorIndex = i;
            break;
          }
        }

        // If none are checked above, start from top
        const start = anchorIndex === -1 ? 0 : anchorIndex + 1;
        for (let i = start; i <= index; i++) {
          updated.add(cards[i].word.id);
        }
      } else {
        if (checked) updated.add(id);
        else updated.delete(id);
      }

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
      <div className="mb-2">
        <Link
          href="/account/setup/vocab"
          className="block w-full text-center text-sm text-white bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded cursor-pointer"
        >
          Add Vocab
        </Link>
      </div>

      <div className="flex justify-between items-center mb-2 gap-2">
        <button
          className="text-sm text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded hover:bg-blue- cursor-pointer"
          onClick={toggleEditMode}
        >
          {editMode ? 'Cancel' : 'Edit'}
        </button>

        <button
          className="text-sm text-white bg-green-500 px-3 py-1 rounded hover:bg-green-600 cursor-pointer"
          onClick={handleToggleFilter}
        >
          {userPrefs?.vocab_filter === 0 ? 'A→Z' : 'Recent'}
        </button>

        <button
          className={`text-sm px-3 py-1 rounded ${
            selectedIds.size > 0
              ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
          onClick={handleDelete}
          disabled={selectedIds.size === 0}
        >
          Delete
        </button>
      </div>

      {cards.map((card, index) => {
        const isSelected = selectedIds.has(card.word.id);
        return (
          <div
            key={card.word.id}
            className={`flex items-center justify-between px-3 py-2 text-sm border-b ${
              selectedWordId === card.word.id
                ? 'bg-blue-200 font-semibold'
                : 'bg-white hover:bg-blue-100'
            } cursor-pointer`}
            onClick={() => {
              if (editMode) {
                handleCheckboxChange(card.word.id, !isSelected, index);
              } else {
                onWordClick(card);
              }
            }}
          >
            <span>{card.word.text}</span>
            {editMode && (
              <Checkbox
                checked={isSelected}
                onChange={(checked) => handleCheckboxChange(card.word.id, checked, index)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FlashcardList;
