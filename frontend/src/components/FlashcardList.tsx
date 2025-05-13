'use client';

import React from 'react';

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
};

const FlashcardList: React.FC<FlashcardListProps> = ({
  cards = [],
  onWordClick,
  selectedWordId,
}) => {
  return (
    <div className="w-64 h-full overflow-y-auto p-2 bg-gray-100 rounded-xl shadow">
      {cards.map((card, index) => (
        <div
          key={index}
          onClick={() => onWordClick(card)}
          className={`cursor-pointer px-3 py-2 text-sm border-b ${
            selectedWordId === card.word.id
              ? 'bg-blue-200 font-semibold'
              : 'bg-white hover:bg-blue-100'
          }`}
        >
          {card.word.text}
        </div>
      ))}
    </div>
  );
};

export default FlashcardList;
