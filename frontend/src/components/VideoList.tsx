'use client';

import { useEffect, useState } from 'react';
import { getVideos } from '@/lib/api';

type Video = {
  id: number;
  url: string;
  title: string;
  channel: { name: string };
};

export default function VideoList() {
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    getVideos().then(setVideos).catch(console.error);
  }, []);

  return (
    <ul className="p-4">
      {videos.map((video) => (
        <li key={video.id} className="flex items-center gap-4 p-2 hover:bg-gray-100 rounded">
          <div>
            <h3 className="font-medium text-sm line-clamp-2">{video.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{video.channel.name}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
