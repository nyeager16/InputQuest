'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import VideoList from '@/components/VideoList';
import VideoGrid from '@/components/VideoGrid';
import { VideoWithScore, getVideoWords, getVideos } from '@/lib/api';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import VideoWordTags from '@/components/VideoWordTags';
import BoundedNumberRangeInput from '@/components/BoundedNumberRangeInput';

export default function VideosPage() {
  const { data: userPrefs, updatePref } = useUserPreferences();
  const [selected, setSelected] = useState<VideoWithScore | null>(null);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(false);
  const [userResized, setUserResized] = useState(false);
  const [leftWidthPercent, setLeftWidthPercent] = useState(100);
  const [comprehensionMin, setComprehensionMin] = useState(0);
  const [comprehensionMax, setComprehensionMax] = useState(100);
  const [useGrid, setUseGrid] = useState(false);
  const [videoWords, setVideoWords] = useState<string[]>([]);
  const [videoWordsLoading, setVideoWordsLoading] = useState(false);

  const [videos, setVideos] = useState<VideoWithScore[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    if (userPrefs) {
      setComprehensionMin(userPrefs.comprehension_level_min);
      setComprehensionMax(userPrefs.comprehension_level_max);
      setUseGrid(userPrefs.grid_view);
    }
  }, [userPrefs]);

  const fetchVideos = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await getVideos({
        nextPageUrl: nextPage,
        comprehensionMin,
        comprehensionMax,
      });
      setVideos((prev) => {
        const existingIds = new Set(prev.map((v) => v.video.id));
        const newUnique = data.results.filter((v) => !existingIds.has(v.video.id));
        return [...prev, ...newUnique];
      });
      setNextPage(data.next);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [nextPage, comprehensionMin, comprehensionMax, loading]);

  useEffect(() => {
    setVideos([]);
    setNextPage(null);
    fetchVideos();
  }, [comprehensionMin, comprehensionMax]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPage) {
          fetchVideos();
        }
      },
      { rootMargin: '100px' }
    );
    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [nextPage, fetchVideos]);

  useEffect(() => {
    if (selected) {
      setShowRight(true);
      if (!showLeft) setShowLeft(true);

      // Only set default width if user hasn't resized manually
      if (!userResized) {
        setLeftWidthPercent(66.66);
      }
    } else {
      setShowRight(false);
    }
  }, [selected]);

  useEffect(() => {
    const fetchWords = async () => {
      if (selected) {
        setVideoWordsLoading(true);
        try {
          const wordsData = await getVideoWords(selected.video.id);
          const words = wordsData.map((w: { text: string }) => w.text);
          setVideoWords(words);
        } catch (err) {
          console.error('Failed to fetch words', err);
          setVideoWords([]);
        } finally {
          setVideoWordsLoading(false);
        }
      } else {
        setVideoWords([]);
      }
    };
    fetchWords();
  }, [selected]);

  const handleHideLeft = () => {
    if (!showRight || !selected) return;
    setShowLeft(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left;
    const newPercent = (offsetX / containerRect.width) * 100;
    if (newPercent >= 25 && newPercent <= 75) {
      setLeftWidthPercent(newPercent);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const startResizing = () => {
    setUserResized(true);
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div ref={containerRef} className="flex h-full relative select-none">
      {/* Left Panel */}
      {showLeft && (
        <div
          className="relative overflow-y-auto flex flex-col border-r px-4 py-2"
          style={{
            width: showRight ? `${leftWidthPercent}%` : '100%',
          }}
        >
          {/* Toolbar */}
          <div className="flex justify-between items-center p-2 gap-2 w-full">
            {/* Comprehension Range Filter */}
            <BoundedNumberRangeInput
              minBound={0}
              maxBound={100}
              minValue={comprehensionMin}
              maxValue={comprehensionMax}
              onChange={({ min, max }) => {
                setComprehensionMin(min);
                setComprehensionMax(max);
                if (min !== comprehensionMin || max !== comprehensionMax) {
                  updatePref({ comprehension_level_min: min, comprehension_level_max: max });
                }
              }}
            />

            {/* View Toggle + Hide */}
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const newGridState = !useGrid;
                  setUseGrid(newGridState);
                  try {
                    await updatePref({ grid_view: newGridState });
                  } catch (err) {
                    console.error('Failed to update grid_view', err);
                    setUseGrid(!newGridState);
                  }
                }}
                className="text-sm px-2 py-1 border rounded bg-white shadow"
              >
                {useGrid ? 'List View' : 'Grid View'}
              </button>
              {showRight && (
                <button
                  onClick={handleHideLeft}
                  disabled={!selected}
                  className="text-sm px-2 py-1 border rounded bg-white shadow disabled:opacity-50"
                >
                  Hide
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {useGrid ? (
              <VideoGrid
                videos={videos}
                loading={loading}
                selectedVideoId={selected?.video.id ?? null}
                onSelect={setSelected}
                sentinelRef={sentinelRef}
              />
            ) : (
              <VideoList
                videos={videos}
                loading={loading}
                selectedVideoId={selected?.video.id ?? null}
                onSelect={setSelected}
                sentinelRef={sentinelRef}
              />
            )}
          </div>
        </div>
      )}

      {/* Resizer */}
      {showLeft && showRight && (
        <div
          onMouseDown={startResizing}
          className="w-1 cursor-col-resize bg-gray-300 hover:bg-gray-400 transition"
        />
      )}

      {/* Right Panel */}
      {showRight && (
        <div
          className="relative overflow-y-auto flex flex-col px-4 py-2"
          style={{
            width: showLeft ? `${100 - leftWidthPercent}%` : '100%',
            maxWidth: '900px',
            marginLeft: 'auto',
          }}
        >
          <div className="h-10" />
          <div className="flex-1 overflow-y-auto">
            {selected ? (
              <div className="space-y-4">
                <div className="w-full aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${selected.video.url}`}
                    title={selected.video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded"
                  ></iframe>
                </div>
                <h2 className="text-base font-semibold">{selected.video.title}</h2>
                {videoWordsLoading ? (
                  <div className="flex justify-center items-center py-6">
                    <svg
                      className="animate-spin h-5 w-5 text-gray-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                  </div>
                ) : (
                  <VideoWordTags words={videoWords} />
                )}
              </div>
            ) : (
              <p>Select a video from the list</p>
            )}
          </div>
        </div>
      )}

      {/* Show Left Panel Button */}
      {!showLeft && (
        <button
          onClick={() => setShowLeft(true)}
          className="absolute top-2 left-4 z-20 bg-white border rounded px-2 py-1 text-sm shadow"
        >
          Show List
        </button>
      )}
    </div>
  );
}
