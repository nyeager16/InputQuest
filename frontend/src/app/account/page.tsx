'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { getUser } from '@/lib/api';

export default function AccountPage() {
  const { data: userPrefs, loading: authLoading, updatePref } = useUserPreferences();
  const router = useRouter();

  const [retentionRate, setRetentionRate] = useState<number>(90);
  const [flashcardOpen, setFlashcardOpen] = useState(false);
  const [statisticsOpen, setStatisticsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userInfo, setUserInfo] = useState<{ username: string; email: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !userPrefs) {
      router.replace('/login?next=/account');
    }
  }, [authLoading, userPrefs, router]);

  useEffect(() => {
    if (userPrefs) {
      setRetentionRate(Math.round(userPrefs.desired_retention * 100));
    }
  }, [userPrefs]);

  const handleReset = () => {
    setRetentionRate(90);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getUser();
        setUserInfo(data);
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      }
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await updatePref({ desired_retention: retentionRate / 100 });
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1">
        <p><span className="font-medium">Username:</span> {userInfo?.username ?? '—'}</p>
        <p><span className="font-medium">Email:</span> {userInfo?.email ?? '—'}</p>
      </div>
      <div className="border-t pt-6 space-y-4">
        {/* Flashcard Settings */}
        <div>
          <button
            onClick={() => setFlashcardOpen((prev) => !prev)}
            className="w-full text-left text-lg font-medium py-2 px-3 rounded bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
          >
            Flashcard Settings
          </button>

          {flashcardOpen && (
            <div className="mt-4 pl-4 border-l border-gray-300 space-y-4">
              <div className="flex items-center gap-4">
                <label htmlFor="retentionRate" className="font-medium text-sm">
                  Desired Retention Rate (%):
                </label>
                <input
                  id="retentionRate"
                  type="number"
                  min={80}
                  max={99}
                  value={retentionRate}
                  onChange={(e) => setRetentionRate(Number(e.target.value))}
                  className="w-20 border rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={handleReset}
                  className="text-sm px-2 py-1 border rounded bg-white hover:bg-gray-100 shadow cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-sm px-3 py-1 border rounded bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div>
          <button
            onClick={() => setStatisticsOpen((prev) => !prev)}
            className="w-full text-left text-lg font-medium py-2 px-3 rounded bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
          >
            Statistics
          </button>

          {statisticsOpen && (
            <div className="mt-4 pl-4 border-l border-gray-300 text-gray-700 text-sm">
              Coming Soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
