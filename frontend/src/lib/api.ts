import type { UserPreferences } from '@/context/UserPreferencesContext';
import { fetchWithAuth } from './fetchWithAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getUserPreferences() {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/preferences/`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to fetch user preferences');
  return data;
}

export async function updateUserPreferences(updates: {
  data: Partial<UserPreferences>
}) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/preferences/`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  if (!ok) throw new Error('Failed to update user preferences');
  return data;
}

export async function getUserWords() {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/userwords/`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to fetch user words');
  return data;
}

export async function getUserWordIds() {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/userwords/ids/`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to fetch user words');
  return data;
}

export async function getCommonWords() {
  const { data, ok } = await fetchWithAuth(`${API_URL}/words/common/100/`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to fetch common words');
  return data;
}

export async function getUserReviews() {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/reviews/`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to fetch user reviews');
  return data;
}

export async function submitReview(userWordId: number, rating: 0 | 1): Promise<void> {
  const { ok } = await fetchWithAuth(
    `${API_URL}/userwords/${userWordId}/update/${rating}/`,
    {
      method: 'PATCH',
    }
  );
  if (!ok) throw new Error('Failed to submit review');
}

export async function addUserWord(wordId: number) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/userwords/${wordId}/`, {
    method: 'POST',
  });
  if (!ok) throw new Error('Failed to add word');
  return data;
}

export async function signupUser(formData: {
  username: string;
  email: string;
  password: string;
  password2: string;
}) {
  const res = await fetch(`${API_URL}/signup/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMessage =
      data.detail ||
      data.message ||
      Object.values(data).flat().join(' ') ||
      'Signup failed';
    throw new Error(errorMessage);
  }

  return data;
}

export async function loginUser(formData: {
  username: string;
  password: string;
}) {
  const res = await fetch(`${API_URL}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMessage =
      data.detail ||
      data.message ||
      Object.values(data).flat().join(' ') ||
      'Login failed';
    throw new Error(errorMessage);
  }

  return data;
}

export async function logoutUser(refreshToken: string) {
  const res = await fetch(`${API_URL}/token/blacklist/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Logout failed');
  }

  return true;
}

export async function getDefinition(wordId: number) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/definitions/${wordId}/`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to fetch definition');
  return data;
}

export async function saveDefinition(wordId: number, text: string) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/definitions/${wordId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!ok) throw new Error('Failed to save definition');
  return data;
}

export async function deleteUserWords(ids: number[]) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/userwords/delete/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });

  if (!ok) throw new Error('Failed to save definition');
  return data;
}

type Video = {
  id: number;
  url: string;
  title: string;
  channel: { name: string };
};

export type VideoWithScore = {
  video: Video;
  score: number;
};

export type PaginatedVideosResponse = {
  results: VideoWithScore[];
  next: string | null;
  previous: string | null;
  count: number;
};

export async function getVideos({
  nextPageUrl,
  comprehensionMin,
  comprehensionMax,
}: {
  nextPageUrl?: string;
  comprehensionMin?: number;
  comprehensionMax?: number;
} = {}): Promise<PaginatedVideosResponse> {
  let url = nextPageUrl ?? `${API_URL}/videos/`;

  const queryParams = new URLSearchParams();

  if (!nextPageUrl && comprehensionMin !== undefined && comprehensionMax !== undefined) {
    queryParams.append('comprehension_min', comprehensionMin.toString());
    queryParams.append('comprehension_max', comprehensionMax.toString());
    url += `?${queryParams.toString()}`;
  }

  const { data, ok } = await fetchWithAuth(url);
  if (!ok) throw new Error('Failed to fetch videos');
  return data;
}


export async function getVideoWords(videoId: number) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/words/video/${videoId}/`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to fetch video words');
  return data;
}
