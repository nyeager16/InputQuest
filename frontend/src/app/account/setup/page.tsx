'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { getLanguages } from '@/lib/api';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Language } from '@/components/LanguageSelection';

const EXPERIENCE_LEVELS = [
  { label: 'Beginner', words: 0 },
  { label: 'A1', words: 500 },
  { label: 'A2', words: 1000 },
  { label: 'B1', words: 2000 },
  { label: 'B2', words: 5000 },
  { label: 'Custom', words: null },
];

export default function SetupPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState<Language | null>(null);
  const [selectedWords, setSelectedWords] = useState<number | null | undefined>(undefined);
  const [customWords, setCustomWords] = useState<string>('');
  const { updatePref } = useUserPreferences();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const data = await getLanguages();
        setLanguages(data);
      } catch (error) {
        console.error('Failed to fetch languages:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLanguages();
  }, []);

  const handleLanguageSelect = async (language: Language) => {
    await updatePref({ language_id: language.id });
    setSelectedLang(language);
  };

  const resetLanguageSelection = () => {
    setSelectedLang(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size={8} color="text-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white relative">
      {/* Language at top, clickable to reselect */}
      {selectedLang && (
        <div className="mt-8 mb-12">
          <div
            onClick={resetLanguageSelection}
            className="cursor-pointer w-36 h-32 border rounded-lg p-4 flex flex-col items-center justify-center bg-white shadow-sm hover:shadow-md"
          >
            <Image
              src={`/flags/${selectedLang.abb}.png`}
              alt={`${selectedLang.name} flag`}
              width={48}
              height={32}
              className="mb-2 rounded object-cover border border-black/30"
            />
            <span className="text-sm font-medium">{selectedLang.name}</span>
          </div>
        </div>
      )}

      {/* Language selection */}
      {!selectedLang && (
        <>
          <h1 className="text-2xl font-semibold mb-6">Choose Your Language</h1>
          <div className="flex flex-wrap justify-center gap-6">
            {languages.map((lang) => (
              <div
                key={lang.id}
                onClick={() => handleLanguageSelect(lang)}
                className="cursor-pointer w-36 h-32 border rounded-lg p-4 flex flex-col items-center justify-center bg-white shadow-sm hover:shadow-md"
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
        </>
      )}

      {/* Experience level selection */}
      {selectedLang && (
        <div className="flex flex-col items-center justify-center pt-16 pb-20">
          <h2 className="text-2xl font-semibold text-center">Choose Your Experience Level</h2>
          <p className="text-sm text-gray-600 text-center mt-2 mb-8 max-w-md">
            Word count represents the amount of common words in your chosen language that will be added to your account.
            <br />
            <br />
            You’ll be able to review and customize them in the next step.
          </p>
          <div className="flex flex-wrap justify-center gap-6" style={{ maxWidth: '540px' }}>
            {EXPERIENCE_LEVELS.map((level) => {
              const isSelected =
                selectedWords !== undefined &&
                (level.words === selectedWords || (level.words === null && selectedWords === null));
              return (
                <div
                  key={level.label}
                  onClick={() => {
                    setSelectedWords(level.words);
                    if (level.words === null) setCustomWords('');
                  }}
                  className={`cursor-pointer w-36 h-24 border rounded-lg p-3 flex flex-col items-center justify-center bg-white shadow-sm hover:shadow-md ${
                    isSelected ? 'border-blue-600 ring-2 ring-blue-300' : ''
                  }`}
                >
                  <span className="text-sm font-semibold">{level.label}</span>
                  <span className="text-xs text-gray-500">
                    {level.words !== null ? `${level.words} words` : ''}
                  </span>
                </div>
              );
            })}
          </div>
          {selectedWords !== undefined && (
            <div className="mt-6 flex flex-col items-center gap-4">
              {selectedWords === null && (
                <input
                  type="number"
                  value={customWords}
                  onChange={(e) => setCustomWords(e.target.value)}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    const min = 0;
                    const max = 9999;
                    if (value < min) {
                      setCustomWords(min.toString());
                    } else if (value > max) {
                      setCustomWords(max.toString());
                    }
                  }}
                  placeholder="Enter word count"
                  className="border rounded px-3 py-2 w-48 text-sm"
                  min={0}
                  max={9999}
                />
              )}
              <button
                className="mt-4 w-48 py-3 text-lg font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-md cursor-pointer"
                onClick={async () => {
                  const words = selectedWords === null ? Number(customWords) : selectedWords;
                  const finalWords = isNaN(words) ? 0 : words;
                  if (finalWords === 0) {
                    await updatePref({ setup_complete: true });
                    router.push('/videos');
                  } else {
                    router.push(`${pathname}/vocab?words=${finalWords}`);
                  }
                }}
              >
                Go
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
