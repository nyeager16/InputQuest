import type { UserPreferences } from '@/context/UserPreferencesContext';
import { fetchWithAuth } from './fetchWithAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getUser() {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to fetch user data');
  return data;
}

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

export async function getUserWords(vocab_filter: number) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/userwords/?vocab_filter=${vocab_filter}`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to fetch user words');
  return data;
}

export async function getCommonWords(pageOrUrl: number | string = 1) {
  const url = typeof pageOrUrl === 'string'
    ? pageOrUrl
    : `${API_URL}/words/common/?page=${pageOrUrl}`;

  const { data, ok } = await fetchWithAuth(url, { method: 'GET' });
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
  const { data, ok } = await fetchWithAuth(`${API_URL}/users/me/userwords/`, {
    method: 'POST',
    body: JSON.stringify({ word_id: wordId }),
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

export async function getVideos(queryString: string): Promise<PaginatedVideosResponse> {
  const url = `${API_URL}/videos/${queryString}`;

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

export async function getQuestions(videoId: number) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/questions/video/${videoId}/`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to fetch video questions');
  return data;
}

type AnswerSubmission = {
  video_id: number;
  answers: {
    question_id: number;
    text: string;
  }[];
};

export async function submitAnswers(payload: AnswerSubmission) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/answers/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!ok) throw new Error('Failed to submit answers');
  return data;
}

export async function getConjugations(wordId: number) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/words/${wordId}/conjugations/`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to get conjugations');
  return data;
}

export async function getLearnData(wordId: number) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/learn/${wordId}/`, {
    method: 'GET',
  });
  if (!ok) throw new Error('Failed to get word data');
  return data;
}

export async function updateUserWordConjugations(
  payload: { word_id: number; needs_review: boolean }[]
) {
  const { data, ok } = await fetchWithAuth(`${API_URL}/userwords/conjugations/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!ok) throw new Error('Failed to update conjugation userwords');
  return data;
}