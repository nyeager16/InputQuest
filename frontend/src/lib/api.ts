import type { UserPreferences } from '@/context/UserPreferencesContext';
import { fetchWithAuth } from './fetchWithAuth';
import type { AnswerSubmission } from '@/types/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getUser(logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/`, {
    method: 'GET',
  }, logout);
  if (!ok) throw new Error('Failed to fetch user data');
  return data;
}

export async function getUserPreferences(logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/preferences/`, {
    method: 'GET',
  }, logout);
  if (!ok) throw new Error('Failed to fetch user preferences');
  return data;
}

export async function updateUserPreferences(
  updates: Partial<UserPreferences>, logout?: () => void
) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/preferences/`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }, logout);
  if (!ok) throw new Error('Failed to update user preferences');
  return data;
}

export async function getUserWords(vocab_filter: number, logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/userwords/?vocab_filter=${vocab_filter}`, {
    method: 'GET',
  }, logout);
  if (!ok) throw new Error('Failed to fetch user words');
  return data;
}

export async function getWordsLearn(pageOrUrl: number | string = 1, logout?: () => void) {
  const url = typeof pageOrUrl === 'string'
    ? pageOrUrl
    : `${API_URL}/words/learn/?page=${pageOrUrl}`;

  const { data, ok } = await fetchWithAuth(url, { method: 'GET' }, logout);
  if (!ok) throw new Error('Failed to fetch common words');
  return data;
}

export async function getUserReviews(logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/reviews/`, {
    method: 'GET',
  }, logout);
  if (!ok) throw new Error('Failed to fetch user reviews');
  return data;
}

export async function submitReview(userWordId: number, rating: 0 | 1, logout?: () => void): Promise<void> {
  const { ok } = await fetchWithAuth(
    `${API_URL}/userwords/${userWordId}/update/${rating}/`,
    {
      method: 'PATCH',
    }, logout
  );
  if (!ok) throw new Error('Failed to submit review');
}

export async function addUserWords(wordIds: number[], logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/userwords/`, {
    method: 'POST',
    body: JSON.stringify({ word_ids: wordIds }),
  }, logout);
  if (!ok) throw new Error('Failed to add words');
  return data;
}

export async function signupUser(formData: {
  username: string;
  email: string;
  password: string;
  password2: string;
},) {
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

export async function getDefinition(wordId: number, logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/definitions/${wordId}/`, {
    method: 'GET',
  }, logout);
  if (!ok) throw new Error('Failed to fetch definition');
  return data;
}

export async function saveDefinition(wordId: number, text: string, logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/definitions/${wordId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }, logout);

  if (!ok) throw new Error('Failed to save definition');
  return data;
}

export async function deleteUserWords(ids: number[], logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/userwords/delete/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  }, logout);

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

export async function getVideos(queryString: string, logout?: () => void): Promise<PaginatedVideosResponse> {
  const url = `${API_URL}/videos/${queryString}`;

  const { data, ok } = await fetchWithAuth(url, undefined, logout);
  if (!ok) throw new Error('Failed to fetch videos');
  return data;
}

export async function getVideoWords(videoId: number, logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/words/video/${videoId}/`, {
    method: 'GET',
  }, logout);
  if (!ok) throw new Error('Failed to fetch video words');
  return data;
}

export async function getQuestions(videoId: number, logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/questions/video/${videoId}/`, {
    method: 'GET',
  }, logout);
  if (!ok) throw new Error('Failed to fetch video questions');
  return data;
}

export async function submitAnswers(payload: AnswerSubmission, logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/answers/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }, logout);

  if (!ok) throw new Error('Failed to submit answers');
  return data;
}

export async function getConjugations(wordId: number, logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/words/${wordId}/conjugations/`, {
    method: 'GET',
  }, logout);
  if (!ok) throw new Error('Failed to get conjugations');
  return data;
}

export async function getLearnData(wordId: number, logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/learn/${wordId}/`, {
    method: 'GET',
  }, logout);
  if (!ok) throw new Error('Failed to get word data');
  return data;
}

export async function updateUserWordConjugations(
  payload: { word_id: number; needs_review: boolean }[], logout?: () => void
) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/userwords/conjugations/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }, logout);

  if (!ok) throw new Error('Failed to update conjugation userwords');
  return data;
}

export async function getLanguages(logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/languages/`, {
    method: 'GET',
  }, logout);
  if (!ok) throw new Error('Failed to get languages');
  return data;
}

export async function getCommonWords(language: number, count: number, exclude: number[] = [], logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/words/common/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ language, count, exclude }),
  }, logout);

  if (!ok) throw new Error('Failed to get common words');
  return data;
}

export async function getSearchWords(language: number, exclude: number[] = [], term: string, logout?: () => void) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/words/search/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ language, exclude, term }),
  }, logout);

  if (!ok) throw new Error('Failed to get search words');
  return data;
}