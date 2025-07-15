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
    <div className="h-screen w-[200px] bg-slate-800 text-white p-4 flex flex-col border-r border-slate-700">
      <Link href="/" className="mb-4 select-none text-xl font-bold text-center">
        InputQuest
      </Link>
      <div className="mb-4 flex justify-center">
        <button
          className="px-2 py-1 rounded transition hover:bg-gray-700 flex items-center gap-2"
        >
          <Image
            src={`/flags/${userPrefs?.language?.abb || 'pl'}.png`}
            alt={`${userPrefs?.language?.name || 'Polish'} flag`}
            width={28}
            height={18}
            className="rounded object-cover border border-black/30"
          />
        </button>
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
          <>
            <Link href="/signup" className={linkClass('/signup')}>Sign Up</Link>
            <Link href="/login" className={linkClass('/login')}>Log In</Link>
          </>
        )}
      </nav>
    </div>
  );
}
