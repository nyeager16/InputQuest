import Image from 'next/image';
import { VideoWithScore } from '@/lib/api';
import ScoreBox from './ScoreBox';

type Props = {
  videos: VideoWithScore[];
  loading: boolean;
  selectedVideoId: number | null;
  onSelect: (video: VideoWithScore) => void;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
};

export default function VideoGrid({ videos, loading, selectedVideoId, onSelect, sentinelRef }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {videos.map((item) => {
        const isSelected = item.video.id === selectedVideoId;
        return (
          <div
            key={item.video.id}
            className={`flex flex-col rounded overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition ${
              isSelected ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => onSelect(item)}
          >
            <div className="w-full aspect-video relative bg-gray-200">
              <Image
                src={`https://img.youtube.com/vi/${item.video.url}/hqdefault.jpg`}
                alt={item.video.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col flex-1 p-2 justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                  {item.video.title}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-1">
                  {item.video.channel.name}
                </p>
              </div>
              <div className="mt-2">
                <ScoreBox score={item.score} />
              </div>
            </div>
          </div>

        );
      })}
      <div ref={sentinelRef} className="col-span-full" />
      {loading && (
        <p className="col-span-full text-center py-4 text-sm text-gray-500">
          Loading more videos...
        </p>
      )}
    </div>
  );
}
