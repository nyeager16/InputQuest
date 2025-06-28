'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import type { Language } from '@/types/types';

type Props = {
  availableLanguages: Language[];
  onSelect: (language: Language) => void;
};

export default function LanguageSelection({ availableLanguages, onSelect }: Props) {
  const [selected, setSelected] = useState<Language | null>(null);

  useEffect(() => {
    if (selected) {
      onSelect(selected);
    }
  }, [selected]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-2xl font-semibold mb-6">Choose Your Language</h1>
        <div className="flex flex-wrap justify-center gap-6">
          {availableLanguages.map((lang) => (
            <div
              key={lang.id}
              onClick={() => setSelected(lang)}
              className={`cursor-pointer w-36 h-32 border rounded-lg p-4 flex flex-col items-center justify-center bg-white shadow-sm hover:shadow-md transition ${
                selected?.id === lang.id ? 'border-blue-500 ring-2 ring-blue-300' : ''
              }`}
            >
              <Image
                src={`/flags/${lang.abb}.png`}
                alt={`${lang.name} flag`}
                width={48}
                height={32}
                className="mb-2 rounded object-cover border border-black/30"
              />
              <span className="text-sm font-medium">{lang.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
