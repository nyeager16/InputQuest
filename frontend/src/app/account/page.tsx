'use client';

import { useState } from 'react';

export default function AccountPage() {
  const [retentionRate, setRetentionRate] = useState(90);
  const [expandedTab, setExpandedTab] = useState<'flashcardSettings' | null>(null);

  const toggleTab = (tab: 'flashcardSettings') => {
    setExpandedTab(expandedTab === tab ? null : tab);
  };

  const handleReset = () => {
    setRetentionRate(90);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <div className="space-y-1">
        <p><span className="font-medium">Username:</span> test</p>
        <p><span className="font-medium">Email:</span> test@example.com</p>
      </div>

      <div className="border-t pt-6">
        <button
          onClick={() => toggleTab('flashcardSettings')}
          className="w-full text-left text-lg font-medium py-2 px-3 rounded bg-gray-100 hover:bg-gray-200 transition"
        >
          Flashcard Settings
        </button>

        {expandedTab === 'flashcardSettings' && (
          <div className="mt-4 pl-4 border-l border-gray-300 space-y-4">
            <div className="flex items-center gap-4">
              <label htmlFor="retentionRate" className="font-medium text-sm">
                Desired Retention Rate (%):
              </label>
              <input
                id="retentionRate"
                type="number"
                min={50}
                max={100}
                value={retentionRate}
                onChange={(e) => setRetentionRate(Number(e.target.value))}
                className="w-20 border rounded px-2 py-1 text-sm"
              />
              <button
                onClick={handleReset}
                className="text-sm px-2 py-1 border rounded bg-white hover:bg-gray-100 shadow"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
