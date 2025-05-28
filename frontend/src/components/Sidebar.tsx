'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { logoutUser } from '@/lib/api';

export default function Sidebar() {
  const { data: userPrefs, clearPrefs } = useUserPreferences();
  const pathname = usePathname();
  const router = useRouter();

  const linkClass = (path: string) =>
    `px-2 py-1 rounded transition ${
      pathname === path ? 'bg-gray-700 font-semibold' : 'hover:bg-gray-700'
    }`;

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh');
    try {
      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    } catch (err) {
      console.warn('Failed to blacklist refresh token, continuing logout anyway.', err);
    } finally {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      clearPrefs();
      router.push('/login');
    }
  };

  return (
    <div className="h-screen w-[240px] bg-slate-800 text-white p-4 flex flex-col border-r border-slate-700">
      <h1 className="text-xl font-bold mb-4 text-center">InputQuest</h1>
      <div className="mb-4 w-full text-center">
        <Image
          src={`/flags/${userPrefs?.language?.abb || 'pl'}.png`}
          alt={`${userPrefs?.language?.abb || 'Polish'} flag`}
          width={40}
          height={24}
          className="mx-auto rounded object-cover border border-black/30"
        />
      </div>
      <nav className="flex flex-col gap-2 flex-grow">
        <Link href="/" className={linkClass('/')}>Home</Link>
        <Link href="/videos" className={linkClass('/videos')}>Videos</Link>
        <Link href="/learn" className={linkClass('/learn')}>Learn</Link>
        <Link href="/review" className={linkClass('/review')}>Review</Link>
        <Link href="/flashcards" className={linkClass('/flashcards')}>My Vocab</Link>
        {userPrefs ? (
          <>
            <Link href="/account" className={linkClass('/account')}>Account</Link>
            <button
              onClick={handleLogout}
              className={`${linkClass('/logout')} w-full text-left cursor-pointer`}
            >
              Log Out
            </button>
          </>
        ) : (
          <Link href="/login" className={linkClass('/login')}>Log In</Link>
        )}
      </nav>
    </div>
  );
}
