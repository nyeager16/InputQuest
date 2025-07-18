'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import VideoList from '@/components/VideoList';
import VideoGrid from '@/components/VideoGrid';
import { VideoWithScore, getVideoWords, getVideos, getQuestions, submitAnswers } from '@/lib/api';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import VideoWordTags from '@/components/VideoWordTags';
import BoundedNumberRangeInput from '@/components/BoundedNumberRangeInput';
import LoadingSpinner from '@/components/LoadingSpinner';
import { LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';

const GENRES = ['All', 'Travel', 'History', 'Geography', 'Science', 'Technology', 'Conversation', 'News', 'Sports'];

export default function VideosPage() {
  const { data: userPrefs, updatePref, loading: prefsLoading } = useUserPreferences();
  const [selected, setSelected] = useState<VideoWithScore | null>(null);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(false);
  const [userResized, setUserResized] = useState(false);
  const [leftWidthPercent, setLeftWidthPercent] = useState(100);
  const [comprehensionRange, setComprehensionRange] = useState({ min: 0, max: 100 });
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [useGrid, setUseGrid] = useState(true);
  const [videoWords, setVideoWords] = useState<{ id: number; text: string }[]>([]);
  const [videoWordsLoading, setVideoWordsLoading] = useState(false);
  const [videos, setVideos] = useState<VideoWithScore[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [readyToFetch, setReadyToFetch] = useState(false);

  const [questionLoading, setQuestionLoading] = useState(false);
  const [questions, setQuestions] = useState<{ id: number; text: string; start: number; end: number }[]>([]);
  const [answers, setAnswers] = useState<{ [id: number]: string }>({});

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ [id: number]: string }>({});

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    if (prefsLoading) return;
    if (userPrefs) {
      setComprehensionRange({
        min: userPrefs.comprehension_level_min,
        max: userPrefs.comprehension_level_max,
      });
      setUseGrid(userPrefs.grid_view);
      setLeftWidthPercent(userPrefs.left_width_percent ?? 66.66);
    } else {
      setComprehensionRange({ min: 0, max: 100 });
      setUseGrid(true);
      setLeftWidthPercent(66.66);
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
    if (loading || (!nextPage && videos.length > 0)) return;
    const params = new URLSearchParams();
    params.set('comprehension_min', comprehensionRange.min.toString());
    params.set('comprehension_max', comprehensionRange.max.toString());
    if (selectedGenre) {
      params.set('genre', selectedGenre);
    }
    if (nextPage) {
      const url = new URL(nextPage, window.location.origin);
      const page = url.searchParams.get('page');
      if (page) params.set('page', page);
    }
    doFetchVideos(params);
  }, [nextPage, comprehensionRange.min, comprehensionRange.max, loading, videos.length]);

  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre);
    setVideos([]);
    setNextPage(null);
    setReadyToFetch(true);
  };

  useEffect(() => {
    if (prefsLoading) return;
    setVideos([]);
    setNextPage(null);
    setReadyToFetch(false);
    const timeout = setTimeout(() => setReadyToFetch(true), 0);
    return () => clearTimeout(timeout);
  }, [comprehensionRange, prefsLoading, selectedGenre]);

  useEffect(() => {
    if (prefsLoading || !readyToFetch) return;
    fetchVideos();
    setReadyToFetch(false);
  }, [readyToFetch, prefsLoading, selectedGenre]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) fetchVideos();
    }, { rootMargin: '100px' });

    const current = sentinelRef.current;
    observer.observe(current);
    return () => current && observer.unobserve(current);
  }, [fetchVideos, useGrid]);

  useEffect(() => {
    if (selected) {
      setShowRight(true);
      if (!showLeft) setShowLeft(true);
      if (!userResized) setLeftWidthPercent(66.66);
    } else {
      setShowRight(false);
    }
    setQuestions([]);
    setAnswers({});
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
        setVideoWords(wordsData.map((w: { id: number; text: string }) => ({ id: w.id, text: w.text })));
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
    if (newPercent >= 25 && newPercent <= 75) setLeftWidthPercent(newPercent);
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    if (userPrefs && leftWidthPercent !== userPrefs.left_width_percent) {
      updatePref({ left_width_percent: leftWidthPercent });
    }
  };

  const startResizing = () => {
    setUserResized(true);
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleGenerateQuestions = async () => {
    if (!selected) return;
    setQuestionLoading(true);
    try {
      const q = await getQuestions(selected.video.id);
      setQuestions(q);
      setAnswers({});
    } catch (err) {
      console.error('Failed to fetch questions', err);
      setQuestions([]);
    } finally {
      setQuestionLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="flex h-full relative select-none">
      {prefsLoading ? (
        <div className="flex justify-center items-center h-full w-full">
          <LoadingSpinner size={36} color="text-black" />
        </div>
      ) : (
        <>
          {showLeft && (
            <div className="relative overflow-y-auto flex flex-col border-r px-4 py-2" style={{ width: showRight ? `${leftWidthPercent}%` : '100%' }}>
              <div className="flex flex-col gap-2 w-full pl-4">
                <div className="flex items-center gap-4 justify-between w-full">
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

                        setVideos([]);
                        setNextPage(null);
                        setReadyToFetch(true);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={async () => {
                      const newGridState = !useGrid;
                      setUseGrid(newGridState);
                      try {
                        await updatePref({ grid_view: newGridState });
                      } catch (err) {
                        console.error('Failed to update grid_view', err);
                        setUseGrid(!newGridState);
                      }
                    }}
                    className="p-2 border rounded bg-white shadow cursor-pointer hover:bg-gray-100"
                    title={useGrid ? 'List View' : 'Grid View'}
                  >
                    {useGrid ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                  </button>
                    {showRight && (
                      <button
                        onClick={handleHideLeft}
                        disabled={!selected}
                        className="p-2 border rounded bg-white shadow disabled:opacity-50 cursor-pointer hover:bg-gray-100"
                        title="Hide Videos"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <div className="overflow-x-auto no-scrollbar">
                    <div className="flex gap-2 px-1 py-1 min-w-max">
                      {GENRES.map((genre) => (
                        <div
                          key={genre}
                          onClick={() => handleGenreSelect(genre)}
                          className={`text-xs px-3 py-1 rounded-full whitespace-nowrap cursor-pointer select-none ${
                            selectedGenre === genre ? 'bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {genre}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {useGrid ? (
                  <VideoGrid videos={videos}
                  loading={loading}
                  selectedVideoId={selected?.video.id ?? null}
                  onSelect={(video) =>
                    setSelected((current) => (current?.video.id === video.video.id ? null : video))
                  }
                  sentinelRef={sentinelRef}
                  />
                ) : (
                  <VideoList videos={videos}
                  loading={loading}
                  selectedVideoId={selected?.video.id ?? null}
                  onSelect={(video) =>
                    setSelected((current) => (current?.video.id === video.video.id ? null : video))
                  }
                  sentinelRef={sentinelRef}
                  />
                )}
              </div>
            </div>
          )}
          {showLeft && showRight && <div onMouseDown={startResizing} className="w-1 cursor-col-resize bg-gray-300 hover:bg-gray-400 transition" />}
          {showRight && (
            <div
              className="relative overflow-y-auto flex flex-col px-4 py-2 mx-auto"
              style={{
                width: showLeft ? `${100 - leftWidthPercent}%` : '100%',
                maxWidth: '900px',
              }}
            >
              <div className="h-10" />
              <div className="flex-1 overflow-y-auto">
                {selected ? (
                  <div className="space-y-4">
                    <div className="w-full aspect-video">
                      <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${selected.video.url}`} title={selected.video.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="rounded" />
                    </div>
                    <h2 className="text-base font-semibold">{selected.video.title}</h2>
                    {videoWordsLoading ? (
                      <div className="flex justify-center items-center py-6">
                        <LoadingSpinner size={24} color="text-black" />
                      </div>
                    ) : (
                      <>
                        <VideoWordTags
                          words={videoWords}
                          onWordAdded={(id) => setVideoWords((prev) => prev.filter((w) => w.id !== id))}
                          userPrefs={userPrefs}
                        />
                        <div className="space-y-4" style={{ maxWidth: '900px' }}>
                          <h3 className="text-base font-medium text-center text-gray-800 mb-4">
                            Test Your Comprehension
                          </h3>
                          {questionLoading ? (
                            <div className="flex justify-center items-center py-6">
                              <LoadingSpinner size={24} color="text-black" />
                            </div>
                          ) : questions.length === 0 ? (
                            <button
                              onClick={userPrefs ? handleGenerateQuestions : undefined}
                              disabled={!userPrefs}
                              className={`w-full max-w-full rounded px-4 py-2 text-sm ${
                                userPrefs ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {userPrefs ? 'Generate Questions' : 'Log in to Generate Questions'}
                            </button>
                          ) : (
                            <div className="space-y-4">
                              {questions.map((q) => (
                                <div key={q.id} className="space-y-1">
                                  <p className="font-medium text-sm">{q.text}</p>
                                  <textarea className="w-full border rounded px-2 py-1 text-sm" rows={2} value={answers[q.id] || ''} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} placeholder="Type your answer..." disabled={submitting || !!feedback[q.id]} />
                                  {feedback[q.id] && <p className="text-sm text-green-600 whitespace-pre-wrap">{feedback[q.id]}</p>}
                                </div>
                              ))}
                              {!Object.keys(feedback).length && (
                                <button onClick={async () => {
                                  if (!selected) return;
                                  const payload = {
                                    video_id: selected.video.id,
                                    answers: Object.entries(answers).map(([questionId, text]) => ({
                                      question_id: Number(questionId),
                                      text,
                                    })),
                                  };
                                  setSubmitting(true);
                                  try {
                                    const response = await submitAnswers(payload);
                                    const parsed: { [id: number]: string } = {};
                                    for (const key in response) parsed[Number(key)] = response[key];
                                    setFeedback(parsed);
                                  } catch (error) {
                                    console.error('Error submitting answers:', error);
                                    alert('There was an error submitting your answers. Please try again.');
                                  } finally {
                                    setSubmitting(false);
                                  }
                                }} className="mb-4 w-full border rounded px-4 py-2 text-sm shadow bg-blue-500 text-white hover:bg-blue-600 cursor-pointer disabled:opacity-50" disabled={submitting}>
                                  {submitting ? (
                                    <div className="flex justify-center">
                                      <LoadingSpinner size={24} color="text-black" />
                                    </div>
                                  ) : (
                                    'Submit Answers'
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </>
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
              className="absolute top-2 left-2 z-20 bg-white border rounded p-2 shadow cursor-pointer hover:bg-gray-100"
              title="Show Video List"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
