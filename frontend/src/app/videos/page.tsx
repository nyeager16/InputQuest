'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import VideoList from '@/components/VideoList';
import VideoGrid from '@/components/VideoGrid';
import { VideoWithScore, getVideoWords, getVideos } from '@/lib/api';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import VideoWordTags from '@/components/VideoWordTags';
import BoundedNumberRangeInput from '@/components/BoundedNumberRangeInput';

export default function VideosPage() {
  const { data: userPrefs, updatePref, loading: prefsLoading } = useUserPreferences();
  const [selected, setSelected] = useState<VideoWithScore | null>(null);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(false);
  const [userResized, setUserResized] = useState(false);
  const [leftWidthPercent, setLeftWidthPercent] = useState(100);
  const [comprehensionRange, setComprehensionRange] = useState({ min: 0, max: 100 });
  const [useGrid, setUseGrid] = useState(false);
  const [videoWords, setVideoWords] = useState<string[]>([]);
  const [videoWordsLoading, setVideoWordsLoading] = useState(false);
  const [videos, setVideos] = useState<VideoWithScore[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [readyToFetch, setReadyToFetch] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizing = useRef(false);

  // Set comprehension range and layout after prefs load
  useEffect(() => {
    if (prefsLoading) return;

    if (userPrefs) {
      setComprehensionRange({
        min: userPrefs.comprehension_level_min,
        max: userPrefs.comprehension_level_max,
      });
      setUseGrid(userPrefs.grid_view);
    } else {
      setComprehensionRange({ min: 0, max: 100 });
      setUseGrid(false);
    }
  }, [userPrefs, prefsLoading]);

  const doFetchVideos = async (params: URLSearchParams) => {
    const queryString = `?${params.toString()}`;
    setLoading(true);
    try {
      const data = await getVideos(queryString);
      setVideos((prev) => {
        const existingIds = new Set(prev.map((v) => v.video.id));
        const newUnique = data.results.filter((v) => !existingIds.has(v.video.id));
        return [...prev, ...newUnique];
      });
      setNextPage(data.next);
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = useCallback(() => {
    if (loading || (!nextPage && videos.length > 0)) {
      return;
    }

    const params = new URLSearchParams();
    params.set('comprehension_min', comprehensionRange.min.toString());
    params.set('comprehension_max', comprehensionRange.max.toString());

    if (nextPage) {
      const url = new URL(nextPage, window.location.origin);
      const page = url.searchParams.get('page');
      if (page) params.set('page', page);
    }

    doFetchVideos(params);
  }, [nextPage, comprehensionRange.min, comprehensionRange.max, loading, videos.length]);

  useEffect(() => {
    if (prefsLoading) return;

    setVideos([]);
    setNextPage(null);
    setReadyToFetch(false);
    const timeout = setTimeout(() => setReadyToFetch(true), 0);
    return () => clearTimeout(timeout);
  }, [comprehensionRange, prefsLoading]);

  useEffect(() => {
    if (prefsLoading || !readyToFetch) return;
    fetchVideos();
    setReadyToFetch(false);
  }, [readyToFetch, prefsLoading]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchVideos();
      }
    }, { rootMargin: '100px' });

    const current = sentinelRef.current;
    observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, [fetchVideos]);

  useEffect(() => {
    if (selected) {
      setShowRight(true);
      if (!showLeft) setShowLeft(true);
      if (!userResized) setLeftWidthPercent(66.66);
    } else {
      setShowRight(false);
    }
  }, [selected]);

  useEffect(() => {
    const fetchWords = async () => {
      if (!selected) {
        setVideoWords([]);
        return;
      }
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
      {prefsLoading ? (
        <div className="flex justify-center items-center h-full w-full">
          <p className="text-gray-500">Loading preferences...</p>
        </div>
      ) : (
        <>
          {showLeft && (
            <div
              className="relative overflow-y-auto flex flex-col border-r px-4 py-2"
              style={{ width: showRight ? `${leftWidthPercent}%` : '100%' }}
            >
              <div className="flex justify-between items-center p-2 gap-2 w-full">
                <BoundedNumberRangeInput
                  minBound={0}
                  maxBound={100}
                  minValue={comprehensionRange.min}
                  maxValue={comprehensionRange.max}
                  onChange={({ min, max }) => {
                    const changed = min !== comprehensionRange.min || max !== comprehensionRange.max;
                    setComprehensionRange({ min, max });
                    if (changed) {
                      updatePref({ comprehension_level_min: min, comprehension_level_max: max });
                    }
                  }}
                />
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

          {showLeft && showRight && (
            <div
              onMouseDown={startResizing}
              className="w-1 cursor-col-resize bg-gray-300 hover:bg-gray-400 transition"
            />
          )}

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
                      />
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
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
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

          {!showLeft && (
            <button
              onClick={() => setShowLeft(true)}
              className="absolute top-2 left-4 z-20 bg-white border rounded px-2 py-1 text-sm shadow"
            >
              Show List
            </button>
          )}
        </>
      )}
    </div>
  );
}
