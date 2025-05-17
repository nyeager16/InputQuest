'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserPreferences } from '@/lib/api';
import { useUserPreferences } from '@/context/UserPreferencesContext';

export default function WatchPage() {
  const router = useRouter();
  const { data: userPrefs, refresh, setPrefs } = useUserPreferences();

  const [queueCI, setQueueCI] = useState<number>(70);
  const [maxClipLength, setMaxClipLength] = useState<number>(300);

  useEffect(() => {
    if (userPrefs) {
      setQueueCI(userPrefs.queue_CI ?? 70);
      setMaxClipLength(userPrefs.max_clip_length ?? 300);
    }
  }, [userPrefs]);

  const handleUpdateQueue = async () => {
    try {
      const updatedPrefs = { queue_CI: queueCI, max_clip_length: maxClipLength };
      await updateUserPreferences(updatedPrefs);
      setPrefs((prev) => ({ ...prev, ...updatedPrefs })); // update local context
      router.push('/watch/queue');
    } catch (error) {
      console.error('Failed to update preferences', error);
      alert('Error updating preference');
    }
  };

  if (!userPrefs) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-700 text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)]">
      <div className="p-8 rounded-2xl max-w-md w-full">
        <h2 className="text-2xl mb-6 font-bold text-gray-800">Comprehensible Input Percentage</h2>

        <div className="flex flex-col items-center gap-4 mb-8">
          <input
            type="range"
            min="0"
            max="100"
            value={queueCI}
            onChange={(e) => setQueueCI(Number(e.target.value))}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xl font-semibold text-gray-700">{queueCI}%</p>
        </div>

        <h2 className="text-2xl mb-6 font-bold text-gray-800">Max Clip Length (Seconds)</h2>

        <div className="flex flex-col items-center gap-4 mb-8">
          <input
            type="range"
            min="30"
            max="600"
            value={maxClipLength}
            onChange={(e) => setMaxClipLength(Number(e.target.value))}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xl font-semibold text-gray-700">{maxClipLength}</p>
        </div>

        <button
          onClick={handleUpdateQueue}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white py-3 rounded-lg text-lg transition"
        >
          Go to Queue
        </button>
      </div>
    </div>
  );
}
