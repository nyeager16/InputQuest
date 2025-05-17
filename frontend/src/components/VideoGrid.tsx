import { useEffect, useRef, useState, useCallback } from 'react';
import { getVideos, VideoWithScore } from '@/lib/api';
import ScoreBox from './ScoreBox';

type Props = {
  selectedVideoId: number | null;
  onSelect: (video: VideoWithScore) => void;
};

export default function VideoGrid({ selectedVideoId, onSelect }: Props) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {videos.map((item) => {
        const isSelected = item.video.id === selectedVideoId;
        return (
          <div
            key={item.video.id}
            className={`border rounded overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition ${
              isSelected ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => onSelect(item)}
          >
            <div className="w-full aspect-video bg-gray-200">
              <img
                src={`https://img.youtube.com/vi/${item.video.url}/hqdefault.jpg`}
                alt={item.video.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                {item.video.title}
              </h3>
              <p className="text-xs text-gray-600 line-clamp-1">
                {item.video.channel.name}
              </p>
              <div className="mt-1">
                <ScoreBox score={item.score} />
              </div>
            </div>
          </div>
        );
      })}
      <div ref={observerRef} className="col-span-full" />
      {loading && (
        <p className="col-span-full text-center py-4 text-sm text-gray-500">
          Loading more videos...
        </p>
      )}
    </div>
  );
}
