'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUserPreferences } from '@/context/UserPreferencesContext';

export default function SetupGuard({ children }: { children: React.ReactNode }) {
  const { data, loading } = useUserPreferences();
  const router = useRouter();

  useEffect(() => {
    if (!loading && data && !data.setup_complete) {
      router.replace('/account/setup');
    }
  }, [loading, data, router]);

  if (loading || (data && !data.setup_complete)) {
    return null;
  }

  return <>{children}</>;
}
