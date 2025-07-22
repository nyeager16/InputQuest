'use client';

import { useEffect, useState, useRef } from 'react';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import YouTube from 'react-youtube';
import type { YouTubePlayer } from 'react-youtube';
import ConjugationTable from '@/components/ConjugationTable';
import LoadingSpinner from '@/components/LoadingSpinner';
import PronunciationGuide from '@/components/PronunciationGuide';
import type { Word, ConjugationCache, LearnData } from '@/types/types';
import { useApiWithLogout } from '@/lib/useApiWithLogout';

const MAX_SEARCH_RESULTS = 5;

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
  const api = useApiWithLogout();
  const { data: userPrefs } = useUserPreferences();
  const [words, setWords] = useState<Word[]>([]);
  const [selectedPOS, setSelectedPOS] = useState<string>('All');
  const [expandedWordId, setExpandedWordId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>('/api/words/common/?page=1');
  const [stopPagination, setStopPagination] = useState(false);

  const [conjugationCache, setConjugationCache] = useState<ConjugationCache>({});
  const [conjugationLoadingId, setConjugationLoadingId] = useState<number | null>(null);

  const [learnDataCache, setLearnDataCache] = useState<{ [wordId: number]: LearnData }>({});
  const [learnDataLoadingId, setLearnDataLoadingId] = useState<number | null>(null);
  const [videoTimestamps, setVideoTimestamps] = useState<{ [wordId: number]: number }>({});
  const [playerReady, setPlayerReady] = useState<{ [wordId: number]: boolean }>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [committedSearchTerm, setCommittedSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Word[]>([]);
  const hasPerformedSearch = useRef(false);

  const observerRef = useRef<HTMLDivElement | null>(null);
  const playerRefs = useRef<{ [wordId: number]: YouTubePlayer }>({});

  const handleExpandWord = async (wordId: number) => {
    const newId = expandedWordId === wordId ? null : wordId;
    setExpandedWordId(newId);

    if (newId === null) return;

    if (newId && !conjugationCache[newId]) {
      try {
        setConjugationLoadingId(newId);
        const data = await api.getConjugations(newId);
        setConjugationCache((prev) => ({ ...prev, [newId]: data }));
      } catch (err) {
        console.error('Failed to load conjugations', err);
      } finally {
        setConjugationLoadingId(null);
      }
    }
    if (!learnDataCache[newId]) {
      try {
        setLearnDataLoadingId(newId);
        const learnData = await api.getLearnData(newId);
        setLearnDataCache((prev) => ({ ...prev, [newId]: learnData }));
        setVideoTimestamps((prev) => ({ ...prev, [newId]: 0 }));
      } catch (err) {
        console.error('Failed to load learn data', err);
      } finally {
        setLearnDataLoadingId(null);
      }
    }
  };

  const handleSearch = async (term: string) => {
    hasPerformedSearch.current = true;

    const trimmed = term.trim();
    if (!trimmed) {
      setSearchResults([]);
      setCommittedSearchTerm('');
      return;
    }

    setSearchLoading(true);
    setSearchResults([]);
    setCommittedSearchTerm(trimmed); // will be overwritten if numeric match

    try {
      const language = userPrefs?.language?.id || 0;
      const results = await api.getSearchWords(language, [], trimmed);
      setSearchResults(results);

      if (results.length > 0) {
        const firstWord = results[0];
        handleExpandWord(firstWord.id);

        // If original search is a number, update input & label to actual word text
        if (!isNaN(Number(trimmed))) {
          setSearchTerm(firstWord.text);
          setCommittedSearchTerm(firstWord.text);
        }
      }
    } catch (err) {
      console.error('Search failed', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (searchResults.length > 0 && expandedWordId === null) {
      handleExpandWord(searchResults[0].id);
    }
  }, [searchResults]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const data = await api.getWordsLearn();
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

        if (initialFiltered.length > 0 && !hasPerformedSearch.current) {
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
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get('search');
    if (initialSearch) {
      setSearchTerm(initialSearch);
      setCommittedSearchTerm(initialSearch);
      handleSearch(initialSearch);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && nextPageUrl && !stopPagination) {
          try {
            const pageNum = parseInt(new URL(nextPageUrl, window.location.href).searchParams.get('page') || '1');
            const data = await api.getWordsLearn(pageNum);
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

  const searchIds = new Set(searchResults.slice(0, MAX_SEARCH_RESULTS).map((w) => w.id));

  const filteredWords = words.filter((word) => {
    if (searchIds.has(word.id)) return false;
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
    if (!userPrefs) {
      alert('Create an account to manage your vocab');
      return;
    }
    try {
      await api.addUserWords([wordId]);
      setWords((prevWords) => prevWords.filter((word) => word.id !== wordId));
    } catch {
      alert('Failed to add word');
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size={36} color="text-black" />
      </div>
    );

  if (error) return <div className="p-4 text-red-500">{error}</div>;
  
  const renderWordItem = (word: Word, keyPrefix = '') => {
    const posLabel = getPOSLabel(word.tag);
    const posColor = POS_COLORS[posLabel] || 'bg-gray-500';
    const isExpanded = expandedWordId === word.id;
    const learnData = learnDataCache[word.id];
    const currentIndex = videoTimestamps[word.id] || 0;
    const currentInstance = learnData?.instances?.[currentIndex];

    return (
      <li key={`${keyPrefix}${word.id}`} className="border-t border-gray-300">
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAdd(word.id);
            }}
            className="bg-green-500 text-white px-3 py-1 text-sm hover:bg-green-600 rounded-sm transition-colors cursor-pointer"
          >
            Add
          </button>
        </div>

        {isExpanded && (
          <div className="bg-gray-50 px-6 py-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <p className="text-xl font-bold">{word.text}</p>
              <p className="text-lg">{learnData?.definition || '...'}</p>
              <div className="flex justify-center">
                <PronunciationGuide language="pl" word={word.ipa} />
              </div>
            </div>
            <div className="flex flex-row gap-6">
              {/* Left: Video */}
              <div className="w-1/2 text-sm text-gray-700 space-y-3 flex flex-col">
                {learnDataLoadingId === word.id ? (
                  <LoadingSpinner size={24} color="text-black" />
                ) : learnData ? (
                  <>
                    <div className="w-full max-w-[480px] aspect-video relative mx-auto">
                      <YouTube
                        videoId={learnData.video_url}
                        onReady={(event) => {
                          playerRefs.current[word.id] = event.target;
                          setPlayerReady((prev) => ({ ...prev, [word.id]: true }));
                        }}
                        opts={{
                          width: '100%',
                          height: '100%',
                          playerVars: { autoplay: 0 }
                        }}
                        className="absolute top-0 left-0 w-full h-full"
                      />
                    </div>
                    {currentInstance && playerReady[word.id] && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded cursor-pointer"
                          onClick={() => {
                            const total = learnData.instances.length;
                            const prevIndex = (currentIndex - 1 + total) % total;
                            setVideoTimestamps((prev) => ({ ...prev, [word.id]: prevIndex }));
                            const newTimestamp = learnData.instances[prevIndex].start;
                            playerRefs.current[word.id]?.seekTo(newTimestamp, true);
                          }}
                        >
                          ←
                        </button>
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded cursor-pointer"
                          onClick={() => {
                            playerRefs.current[word.id]?.seekTo(currentInstance.start, true);
                          }}
                        >
                          Skip to {currentInstance.word__text}
                        </button>
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded cursor-pointer"
                          onClick={() => {
                            const total = learnData.instances.length;
                            const nextIndex = (currentIndex + 1) % total;
                            setVideoTimestamps((prev) => ({ ...prev, [word.id]: nextIndex }));
                            const newTimestamp = learnData.instances[nextIndex].start;
                            playerRefs.current[word.id]?.seekTo(newTimestamp, true);
                          }}
                        >
                          →
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-red-500">Failed to load video</p>
                )}
              </div>

              {/* Right: Conjugation */}
              <div className="w-1/2 overflow-x-auto">
                {conjugationLoadingId === word.id ? (
                  <LoadingSpinner size={24} color="text-black" />
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
  };

  return (
    <div className="flex flex-col items-center px-4 py-4">
      <div className="w-full max-w-5xl">
        {/* Search */}
        <div className="mb-2 flex justify-center w-full">
          <div className="flex items-center gap-2 w-full max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchTerm);
                }
              }}
              placeholder="Search..."
              className="border rounded px-4 py-2 w-full text-sm shadow-sm"
            />
            <button
              className="px-4 py-2 rounded text-sm text-white bg-green-600 hover:bg-green-700 transition cursor-pointer"
              onClick={() => handleSearch(searchTerm)}
            >
              Go
            </button>
          </div>
        </div>
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
          {(searchLoading || searchResults.length > 0) && (
            <>
              <li className="bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 text-center tracking-wide">
                Search for &quot;{committedSearchTerm}&quot;
              </li>

              {searchLoading ? (
                <div className="flex justify-center items-center py-8">
                  <LoadingSpinner size={24} color="text-black" />
                </div>
              ) : (
                searchResults.slice(0, MAX_SEARCH_RESULTS).map((w) => renderWordItem(w, 'search-'))
              )}
            </>
          )}
          <li className="bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 text-center tracking-wide">
            Common Words
          </li>
          {filteredWords.map((word) => renderWordItem(word))}
          <div ref={observerRef} className="h-8"></div>
        </ul>
      </div>
    </div>
  );
}
