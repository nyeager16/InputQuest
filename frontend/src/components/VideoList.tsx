import { VideoWithScore } from '@/lib/api';
import ScoreBox from './ScoreBox';

type Props = {
  videos: VideoWithScore[];
  loading: boolean;
  selectedVideoId: number | null;
  onSelect: (video: VideoWithScore) => void;
  sentinelRef: React.RefObject<HTMLDivElement>;
};

export default function VideoList({ videos, loading, selectedVideoId, onSelect, sentinelRef }: Props) {
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
      <div ref={sentinelRef} />
      {loading && (
        <p className="text-center py-4 text-sm text-gray-500">Loading more videos...</p>
      )}
    </ul>
  );
}
