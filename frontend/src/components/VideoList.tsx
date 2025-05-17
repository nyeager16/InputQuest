import { useEffect, useRef, useState, useCallback } from 'react';
import { getVideos, VideoWithScore } from '@/lib/api';
import ScoreBox from './ScoreBox';

type Props = {
  selectedVideoId: number | null;
  onSelect: (video: VideoWithScore) => void;
};

export default function VideoList({ selectedVideoId, onSelect }: Props) {
  const [videos, setVideos] = useState<VideoWithScore[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const fetchVideos = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await getVideos(nextPage ?? undefined);
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
  }, [nextPage, loading]);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPage) {
          fetchVideos();
        }
      },
      { rootMargin: '100px' }
    );

    const sentinel = observerRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [nextPage, fetchVideos]);

  return (
    <ul className="p-4">
      {videos.map((item) => {
        const isSelected = item.video.id === selectedVideoId;
        return (
          <li
            key={item.video.id}
            className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-100 ${
              isSelected ? 'bg-blue-100' : ''
            }`}
            onClick={() => onSelect(item)}
          >
            <ScoreBox score={item.score} />
            <div className="flex-1">
              <h3 className="font-medium text-sm text-gray-900 line-clamp-1">{item.video.title}</h3>
              <p className="text-xs text-gray-600 line-clamp-1">{item.video.channel.name}</p>
            </div>
          </li>
        );
      })}
      <div ref={observerRef} />
      {loading && (
        <p className="text-center py-4 text-sm text-gray-500">Loading more videos...</p>
      )}
    </ul>
  );
}
