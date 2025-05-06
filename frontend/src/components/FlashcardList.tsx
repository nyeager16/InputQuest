'use client';

import React from 'react';

type WordCard = {
  word: {
    text: string;
  };
  data: Record<string, any>;
};

type FlashcardListProps = {
  cards?: WordCard[];
  onWordClick: (card: WordCard) => void;
};

const FlashcardList: React.FC<FlashcardListProps> = ({ cards = [], onWordClick }) => {
  return (
    <div className="space-y-2 w-64 p-4 bg-gray-100 rounded-xl shadow">
      {cards.map((card, index) => (
        <div
          key={index}
          onClick={() => onWordClick(card)}
          className="cursor-pointer px-4 py-2 bg-white hover:bg-blue-100 rounded transition"
        >
          {card.word.text}
        </div>
      ))}
    </div>
  );
};

export default FlashcardList;
