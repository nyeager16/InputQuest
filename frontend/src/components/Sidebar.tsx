'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getUserPreferences } from '@/lib/api';

export default function Sidebar() {
  const [userPrefs, setUserPrefs] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const data = await getUserPreferences();
        setUserPrefs(data);
      } catch (err) {
        console.error('Could not load user preferences:', err);
      }
    };
    loadPrefs();
  }, []);

  const linkClass = (path: string) =>
    `px-2 py-1 rounded transition ${
      pathname === path ? 'bg-gray-700 font-semibold' : 'hover:bg-gray-700'
    }`;

  return (
    <div className="fixed top-0 left-0 w-64 h-screen bg-gray-800 text-white p-4 flex flex-col">
      <h1 className="text-xl font-bold mb-4">InputQuest</h1>

      <div className="mb-4">
        Language: {userPrefs?.language || 'Polishtest'}
      </div>

      <nav className="flex flex-col gap-2 flex-grow">
        <Link href="/videos" className={linkClass('/videos')}>Videos</Link>
        <Link href="/watch" className={linkClass('/watch')}>Watch</Link>
        <Link href="/learn" className={linkClass('/learn')}>Learn</Link>
        <Link href="/review" className={linkClass('/review')}>Review</Link>
        <Link href="/flashcards" className={linkClass('/flashcards')}>My Vocab</Link>
        <Link href="/about" className={linkClass('/about')}>About</Link>

        {userPrefs ? (
          <>
            <Link href="/account" className={linkClass('/account')}>Account</Link>
            <form action="/api/logout" method="POST">
              <button
                type="submit"
                className="text-left px-2 py-1 rounded hover:bg-red-600 transition"
              >
                Log Out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className={linkClass('/login')}>Log In</Link>
        )}
      </nav>
    </div>
  );
}
