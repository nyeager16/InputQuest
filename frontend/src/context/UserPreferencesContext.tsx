'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getUserPreferences, updateUserPreferences } from '@/lib/api';

type UserPreferences = {
  id: number;
  language: { id: number; name: string; abb: string };
  comprehension_level_min: number;
  comprehension_level_max: number;
  queue_CI: number;
  desired_retention: number;
  fsrs: boolean;
  vocab_filter: number;
  max_clip_length: number;
  learn_hide_vocab: boolean;
  grid_view: boolean;
  user: number;
  word_set: number;
};

type ContextType = {
  data: UserPreferences | null;
  refresh: () => void;
  setPrefs: React.Dispatch<React.SetStateAction<UserPreferences | null>>;
  updatePref: (updates: Partial<UserPreferences>) => Promise<void>;
};

const UserPreferencesContext = createContext<ContextType>({
  data: null,
  refresh: () => {},
  setPrefs: () => {},
  updatePref: async () => {},
});

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getUserPreferences();
      setUserPrefs(data);
    } catch (e) {
      console.error('Failed to refresh preferences', e);
    }
  }, []);

  const updatePref = async (updates: Partial<UserPreferences>) => {
    if (!userPrefs) return;
    try {
      await updateUserPreferences(updates);
      setUserPrefs((prev) => prev ? { ...prev, ...updates } : prev);
    } catch (e) {
      console.error('Failed to update preferences', e);
    }
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <UserPreferencesContext.Provider value={{ data: userPrefs, refresh, setPrefs: setUserPrefs, updatePref }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export const useUserPreferences = () => useContext(UserPreferencesContext);
