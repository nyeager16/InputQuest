'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useApiWithLogout } from '@/lib/useApiWithLogout';

export type UserPreferences = {
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
  left_width_percent: number;
  setup_complete: boolean;
};

type ContextType = {
  data: UserPreferences | null;
  loading: boolean;
  refresh: () => void;
  setPrefs: React.Dispatch<React.SetStateAction<UserPreferences | null>>;
  updatePref: (
    updates: Partial<UserPreferences> & {
      language_id?: number;
      word_set_id?: number;
    }
  ) => Promise<void>;
  clearPrefs: () => void;
  logout: () => void;
};

const UserPreferencesContext = createContext<ContextType>({
  data: null,
  loading: true,
  refresh: () => {},
  setPrefs: () => {},
  updatePref: async () => {},
  clearPrefs: () => {},
  logout: () => {},
});

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const api = useApiWithLogout();
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getUserPreferences();
      setUserPrefs(data);
    } catch (e) {
      console.error('Failed to refresh preferences', e);
      setUserPrefs(null); // Unauthenticated users are null
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updatePref = async (
    updates: Partial<UserPreferences> & {
      language_id?: number;
      word_set_id?: number;
    }
  ) => {
    if (!userPrefs) return;
    try {
      await api.updateUserPreferences(updates);
      const hasForeignKey = 'language_id' in updates || 'word_set_id' in updates;
      if (hasForeignKey) {
        await refresh(); // fetch fresh data with nested fields updated
      } else {
        setUserPrefs((prev) => (prev ? { ...prev, ...updates } : prev));
      }
    } catch (e) {
      console.error('Failed to update preferences', e);
    }
  };

  const clearPrefs = () => {
    setUserPrefs(null);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUserPrefs(null);
    window.location.href = '/login';
  }, []);

  return (
    <UserPreferencesContext.Provider
      value={{
        data: userPrefs,
        loading,
        refresh,
        setPrefs: setUserPrefs,
        updatePref,
        clearPrefs,
        logout,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export const useUserPreferences = () => useContext(UserPreferencesContext);
