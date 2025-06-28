'use client';

import { useEffect, useState, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { getCommonWords, addUserWords, getSearchWords } from '@/lib/api';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import type { Word, WordGroup, FlattenedItem } from '@/types/types';
import { getPOSLabel, POS_COLORS } from '@/lib/utils';
import Checkbox from '@/components/Checkbox';
import LoadingSpinner from '@/components/LoadingSpinner';

const POS_ORDER = ['verb', 'noun', 'adj', 'adv', 'pron', 'prep', 'part', 'int', 'other'];

export default function VocabPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: userPrefs, updatePref } = useUserPreferences();

  const [wordGroups, setWordGroups] = useState<WordGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [customWords, setCustomWords] = useState('100');
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingWords, setIsAddingWords] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Word[]>([]);

  const flattenWords: FlattenedItem[] = wordGroups.flatMap((group, groupIndex) => {
    const header = [{ type: 'header', label: group.label, groupIndex }] as const;

    const sorted = [...group.words].sort((a, b) => {
      const posA = getPOSLabel(a.tag);
      const posB = getPOSLabel(b.tag);
      return POS_ORDER.indexOf(posA) - POS_ORDER.indexOf(posB);
    });

    const words = sorted.map((word, wordIndex) => ({
      type: 'word' as const,
      word,
      groupIndex,
      wordIndex,
    }));

    return [...header, ...words];
  });

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

  useEffect(() => {
    const fetchWords = async () => {
      const wordCountParam = searchParams.get('words');
      const wordCount = Number(wordCountParam);
      if (!userPrefs?.language?.id || isNaN(wordCount)) return;

      try {
        const data = await getCommonWords(userPrefs.language.id, wordCount, []);
        setWordGroups([{ label: `Initial Batch: ${data.length} words`, words: data }]);
      } catch (error) {
        console.error('Failed to load words:', error);
      }
    };
    fetchWords();
  }, [searchParams, userPrefs]);

  const handleSearch = async () => {
    if (!userPrefs?.language?.id || !searchTerm.trim()) return;

    setSearchResults([]);
    setIsSearching(true);
    try {
      const existingIds = wordGroups.flatMap((group) =>
        group.words.map((word) => word.id)
      );

      const results = await getSearchWords(userPrefs.language.id, existingIds, searchTerm.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSearchedWord = (word: Word) => {
    const label = `Search for "${searchTerm}"`;

    setWordGroups((prev) => {
      const updated = [...prev];
      const existing = updated.find((g) => g.label === label);

      if (existing) {
        if (!existing.words.some((w) => w.id === word.id)) {
          existing.words.unshift(word);
        }
      } else {
        updated.unshift({ label, words: [word] });
      }

      return updated;
    });
    setSearchResults((prev) => prev.filter((w) => w.id !== word.id));
  };

  const handleAddWords = async () => {
    const count = Number(customWords);
    if (!userPrefs?.language?.id || isNaN(count) || count <= 0) return;
    
    setIsAddingWords(true);
    try {
      const existingIds = wordGroups.flatMap((group) => group.words.map((w) => w.id));
      const data = await getCommonWords(userPrefs.language.id, count, existingIds);
      setWordGroups((prev) => [
        { label: `Added Batch: ${data.length} words`, words: data },
        ...prev,
      ]);
    } catch (error) {
      console.error('Failed to fetch additional words:', error);
    } finally {
      setIsAddingWords(false);
    }
  };

  const handleDelete = () => {
    setWordGroups((prevGroups) =>
      prevGroups.map((group) => ({
        ...group,
        words: group.words.filter((word) => !selectedIds.has(word.id)),
      }))
      .filter((group) => group.words.length > 0)
    );
    setSelectedIds(new Set());
  };

  const handleDone = async () => {
    const allWordIds = wordGroups.flatMap((group) => group.words.map((word) => word.id));

    setIsFinishing(true);
    try {
      await addUserWords(allWordIds);
      await updatePref({ setup_complete: true });
      router.push('/videos');
    } catch (error) {
      console.error('Failed to complete import:', error);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleCheckboxChange = (
    checked: boolean,
    wordId: number,
    index: number
  ) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);

      if (checked) {
        if (isShiftPressed) {
          let startIndex = 0;

          for (let i = index - 1; i >= 0; i--) {
            const item = flattenWords[i];
            if (item.type === 'word' && selectedIds.has(item.word.id)) {
              startIndex = i;
              break;
            }
          }

          for (let i = startIndex; i <= index; i++) {
            const item = flattenWords[i];
            if (item.type === 'word') {
              updated.add(item.word.id);
            }
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
    const item = flattenWords[index];

    if (item.type === 'header') {
      return (
        <div
          style={style}
          className="bg-gray-100 font-semibold text-xs text-gray-700 px-4 py-2 border-b sticky top-0 z-0"
        >
          {item.label}
        </div>
      );
    }

    const word = item.word;
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
    <div className="min-h-screen flex flex-row">
      {/* LEFT PANEL: Word List */}
      <div className="w-[400px] border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b bg-white sticky top-0 z-10 flex justify-end">
          <button
            onClick={handleDelete}
            disabled={selectedIds.size === 0}
            className={`px-3 py-2 text-sm font-medium rounded ${
              selectedIds.size > 0
                ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Delete
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={flattenWords.length}
                itemSize={40}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        </div>
      </div>

      {/* RIGHT PANEL: Search and Actions */}
      <div className="flex-1 px-6 py-6 flex items-start">
        <div className="w-full max-w-sm flex flex-col gap-6">
          {/* Search Box */}
          <div className="border rounded p-4 bg-white shadow w-full h-[300px] flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search words"
                className="border rounded px-4 py-2 w-full text-sm"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className={`px-4 py-2 rounded text-sm text-white ${
                  isSearching ? 'bg-green-600' : 'bg-green-600 hover:bg-green-700 cursor-pointer'
                }`}
              >
                Go
              </button>
            </div>

            <div className="flex-1 overflow-auto text-sm text-gray-700">
              {isSearching ? (
                <div className="flex justify-center items-center h-full text-gray-400">
                  <LoadingSpinner size={5} />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-gray-400 italic">Search results will appear here...</p>
              ) : (
                <div className="divide-y border rounded bg-white">
                  {searchResults.map((word) => {
                    const posLabel = getPOSLabel(word.tag);
                    const posColor = POS_COLORS[posLabel] || 'bg-gray-500';
                    return (
                      <div key={word.id} className="px-4 py-2 flex items-center gap-3 text-sm">
                        <span className={`text-xs font-semibold w-16 text-center py-1 rounded text-white ${posColor}`}>
                          {posLabel}
                        </span>
                        <span className="text-sm font-medium">{word.text}</span>
                        <div className="ml-auto">
                          <button
                            onClick={() => handleAddSearchedWord(word)}
                            className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Add Common Words */}
          <div className="border-t pt-6">
            <div className="w-full text-center mb-2">
              <p className="text-sm font-medium">Add Common Words</p>
            </div>
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
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
                <button
                  onClick={handleAddWords}
                  disabled={isAddingWords}
                  className={`px-4 py-2 rounded text-sm text-white ${
                    isAddingWords ? 'bg-green-600' : 'bg-green-600 hover:bg-green-700 cursor-pointer'
                  }`}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Done Button */}
          <div className="border-t pt-6 flex justify-center">
            <button
              onClick={handleDone}
              disabled={isFinishing}
              className={`px-6 py-3 rounded-lg text-lg font-semibold text-white ${
                isFinishing ? 'bg-blue-600' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
