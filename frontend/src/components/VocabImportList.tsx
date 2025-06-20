'use client';

import React, { memo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import type { Word } from '@/types/types';
import { getPOSLabel, POS_COLORS } from '@/lib/utils';
import Checkbox from '@/components/Checkbox';

type VocabImportListProps = {
  words: Word[];
  selectedIds: Set<number>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  onDelete: () => void;
};

const VocabImportList: React.FC<VocabImportListProps> = ({
  words,
  selectedIds,
  setSelectedIds,
  onDelete,
}) => {
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
    <div className="w-full max-w-md mx-auto bg-gray-100 rounded-lg shadow max-h-[80vh]">
      <div className="p-4 border-b bg-white sticky top-0 z-10 flex justify-end">
        <button
          onClick={onDelete}
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
  );
};

export default VocabImportList;
