import VideoList from '@/components/VideoList';

export default function VideosPage() {
  return (
    <div className="flex h-screen">
      <div className="w-1/2 border-r overflow-y-auto">
        <VideoList />
      </div>
      <div className="w-1/2 p-4">
        <p>Select a video from the list</p>
      </div>
    </div>
  );
}