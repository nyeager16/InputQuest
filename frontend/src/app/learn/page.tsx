'use client';

import { useEffect, useState, useRef } from 'react';
import { getCommonWords, addUserWord, getConjugations } from '@/lib/api';
import { useRouter } from 'next/navigation';
import ConjugationTable from '@/components/ConjugationTable';
import LoadingSpinner from '@/components/LoadingSpinner';

type Word = {
  id: number;
  text: string;
  tag: string;
};

type ConjugationCache = {
  [wordId: number]: any;
};

const POS_CATEGORIES: { [label: string]: string[] } = {
  noun: ['subst'],
  verb: ['inf'],
  adj: ['adj'],
  adv: ['adv'],
  pron: ['ppron', 'siebie'],
  prep: ['prep'],
  part: ['part'],
  int: ['interj'],
  other: []
};

const POS_COLORS: { [label: string]: string } = {
  noun: 'bg-blue-500',
  verb: 'bg-green-500',
  adj: 'bg-purple-500',
  adv: 'bg-yellow-500',
  pron: 'bg-pink-500',
  prep: 'bg-indigo-500',
  part: 'bg-gray-500',
  int: 'bg-red-500',
  other: 'bg-black'
};

export default function LearnPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [selectedPOS, setSelectedPOS] = useState<string>('All');
  const [expandedWordId, setExpandedWordId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>('/api/words/common/?page=1');
  const [stopPagination, setStopPagination] = useState(false);

  const [conjugationCache, setConjugationCache] = useState<ConjugationCache>({});
  const [conjugationLoadingId, setConjugationLoadingId] = useState<number | null>(null);

  const observerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const handleExpandWord = async (wordId: number) => {
    const newId = expandedWordId === wordId ? null : wordId;
    setExpandedWordId(newId);

    if (newId && !conjugationCache[newId]) {
      try {
        setConjugationLoadingId(newId);
        const data = await getConjugations(newId);
        console.log("Conjugation data for wordId", newId, data);
        setConjugationCache((prev) => ({ ...prev, [newId]: data }));
      } catch (err) {
        console.error('Failed to load conjugations', err);
      } finally {
        setConjugationLoadingId(null);
      }
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const data = await getCommonWords();
        const uniqueWords = data.results.filter((word: Word) => !words.some((w) => w.id === word.id));
        const combined = [...words, ...uniqueWords];
        setWords(combined);
        setNextPageUrl(data.next);

        const initialFiltered = combined.filter((word) => {
          const posTags = selectedPOS === 'All' ? null : POS_CATEGORIES[selectedPOS] ?? [];
          return posTags ? posTags.some((prefix) => word.tag?.startsWith(prefix)) : true;
        });

        if (initialFiltered.length === 0 && selectedPOS !== 'All') {
          setStopPagination(true);
        }

        if (initialFiltered.length > 0) {
          handleExpandWord(initialFiltered[0].id);
        }
      } catch (err) {
        console.error('Failed to load words', err);
        setError('Failed to load words');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && nextPageUrl && !stopPagination) {
          try {
            const pageNum = parseInt(new URL(nextPageUrl, window.location.href).searchParams.get('page') || '1');
            const data = await getCommonWords(pageNum);
            const uniqueWords = data.results.filter((word: Word) => !words.some((w) => w.id === word.id));
            const combined = [...words, ...uniqueWords];
            setWords(combined);
            setNextPageUrl(data.next);

            const newFiltered = uniqueWords.filter((word: Word) => {
              const posTags = selectedPOS === 'All' ? null : POS_CATEGORIES[selectedPOS] ?? [];
              return posTags ? posTags.some((prefix) => word.tag?.startsWith(prefix)) : true;
            });

            if (newFiltered.length === 0 && selectedPOS !== 'All') {
              setStopPagination(true);
            }
          } catch (err) {
            console.error('Failed to load more words', err);
          }
        }
      },
      { threshold: 1.0 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [nextPageUrl, selectedPOS, stopPagination, words]);

  const filteredWords = words.filter((word) => {
    const posTags = selectedPOS === 'All' ? null : POS_CATEGORIES[selectedPOS] ?? [];
    return posTags ? posTags.some((prefix) => word.tag?.startsWith(prefix)) : true;
  });

  const getPOSLabel = (tag: string): string => {
    for (const [label, prefixes] of Object.entries(POS_CATEGORIES)) {
      if (prefixes.some((prefix) => tag.startsWith(prefix))) {
        return label;
      }
    }
    return 'other';
  };

  const handleAdd = async (wordId: number) => {
    try {
      await addUserWord(wordId);
      setWords((prevWords) => prevWords.filter((word) => word.id !== wordId));
    } catch {
      alert('Failed to add word');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="flex flex-col items-center px-4 py-4">
      <div className="w-full max-w-5xl">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-2 px-1 py-1 min-w-max">
            {['All', ...Object.keys(POS_CATEGORIES)].map((pos) => (
              <div
                key={pos}
                onClick={() => {
                  setSelectedPOS(pos);
                  setStopPagination(false);

                  const newFiltered = words.filter((word) => {
                    const posTags = pos === 'All' ? null : POS_CATEGORIES[pos] ?? [];
                    return posTags ? posTags.some((prefix) => word.tag?.startsWith(prefix)) : true;
                  });

                  if (newFiltered.length > 0) {
                    handleExpandWord(newFiltered[0].id);
                  } else {
                    setExpandedWordId(null);
                  }
                }}
                className={`text-xs px-3 py-1 rounded-full whitespace-nowrap cursor-pointer select-none ${
                  selectedPOS === pos ? 'bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {pos === 'All'
                  ? 'All'
                  : {
                      noun: 'Noun',
                      verb: 'Verb',
                      adj: 'Adjective',
                      adv: 'Adverb',
                      pron: 'Pronoun',
                      prep: 'Preposition',
                      part: 'Particle',
                      int: 'Interjection',
                      other: 'Other'
                    }[pos]}
              </div>
            ))}
          </div>
        </div>

        <ul className="pt-4">
          {filteredWords.map((word) => {
            const posLabel = getPOSLabel(word.tag);
            const posColor = POS_COLORS[posLabel] || 'bg-gray-500';
            const isExpanded = expandedWordId === word.id;

            return (
              <li
                key={word.id}
                className="border-t border-gray-300"
              >
                <div
                  className="flex items-center justify-between gap-3 p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleExpandWord(word.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`text-xs font-semibold w-16 text-center py-1 rounded text-white ${posColor}`}>
                      {posLabel}
                    </div>
                    <span className="text-sm font-medium">{word.text}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/learn/${word.text}`);
                      }}
                      className="bg-blue-500 text-white px-3 py-1 text-sm hover:bg-blue-600 rounded-sm transition-colors"
                    >
                      Learn
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(word.id);
                      }}
                      className="bg-green-500 text-white px-3 py-1 text-sm hover:bg-green-600 rounded-sm transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="bg-gray-50 px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-row gap-6">
                      {/* Left side placeholder/summary */}
                      <div className="w-1/2 text-sm text-gray-600">
                        <p className="italic">Placeholder</p>
                      </div>

                      {/* Right side: conjugation table */}
                      <div className="w-1/2 overflow-x-auto">
                        {conjugationLoadingId === word.id ? (
                          <LoadingSpinner size={4} color="text-black" />
                        ) : conjugationCache[word.id] ? (
                          <ConjugationTable data={conjugationCache[word.id]} />
                        ) : (
                          <div className="text-sm text-red-500">Failed to load conjugation</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          <div ref={observerRef} className="h-8"></div>
        </ul>
      </div>
    </div>
  );
}