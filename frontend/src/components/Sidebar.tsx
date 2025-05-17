'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserPreferences } from '@/context/UserPreferencesContext';

export default function Sidebar() {
  const { data: userPrefs } = useUserPreferences();
  const pathname = usePathname();
  console.log(userPrefs);

  const linkClass = (path: string) =>
    `px-2 py-1 rounded transition ${
      pathname === path ? 'bg-gray-700 font-semibold' : 'hover:bg-gray-700'
    }`;

  return (
    <div className="h-screen w-fit bg-gray-800 text-white p-4 flex flex-col">
      <h1 className="text-xl font-bold mb-4">InputQuest</h1>

      <div className="mb-4 w-full text-center">
        Language: {userPrefs?.language?.abb || 'Loading...'}
      </div>

      <nav className="flex flex-col gap-2 flex-grow">
        <Link href="/" className={linkClass('/')}>Home</Link>
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
