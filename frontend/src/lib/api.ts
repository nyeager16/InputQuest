import { fetchWithAuth } from './fetchWithAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getUserPreferences() {
  const res = await fetchWithAuth(`${API_URL}/api/users/me/preferences/`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to fetch user preferences');
  return await res.json();
}

export async function updateUserPreferences(data: {
  queue_CI: number;
  max_clip_length: number;
}) {
  const res = await fetchWithAuth(`${API_URL}/api/users/me/preferences/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update user preferences');
  return await res.json();
}

export async function getUserWords() {
  const res = await fetchWithAuth(`${API_URL}/api/users/me/userwords/`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to fetch user words');
  return await res.json();
}

export async function getUserWordIds() {
  const res = await fetchWithAuth(`${API_URL}/api/users/me/userwords/ids/`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to fetch user words');
  return await res.json();
}

export async function getCommonWords() {
  const res = await fetchWithAuth(`${API_URL}/api/words/common/100/`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to fetch common words');
  return await res.json();
}

export async function getUserReviews() {
  const res = await fetchWithAuth(`${API_URL}/api/users/me/reviews/`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to fetch user reviews');
  return await res.json();
}

export async function submitReview(userWordId: number, rating: 0 | 1): Promise<void> {
  const res = await fetchWithAuth(
    `${API_URL}/api/userwords/${userWordId}/update/${rating}/`, {
      method: 'PATCH',
    });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.detail || 'Failed to submit review');
  }
}

export async function addUserWord(wordId: number) {
  const res = await fetchWithAuth(`${API_URL}/api/users/me/userwords/${wordId}/`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to add word');
  }
  return await res.json().catch(() => ({}));
}

export async function signupUser(formData: {
  username: string;
  email: string;
  password: string;
  password2: string;
}) {
  const res = await fetch(`${API_URL}/api/signup/`, {
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
  const res = await fetch(`${API_URL}/api/login/`, {
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

export async function getDefinition(wordId: number) {
  const res = await fetchWithAuth(`${API_URL}/api/definitions/${wordId}/`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to fetch definition');
  return await res.json();
}

export async function saveDefinition(wordId: number, text: string) {
  const res = await fetchWithAuth(`${API_URL}/api/definitions/${wordId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to save definition');
  return await res.json();
}

export async function deleteUserWords(ids: number[]) {
  const res = await fetchWithAuth(`${API_URL}/api/userwords/delete/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  },);
  if (!res.ok) throw new Error('Failed to save definition');
  return await res.json();
}

export async function getVideos() {
  const res = await fetchWithAuth(`${API_URL}/api/videos/`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to fetch videos');
  return await res.json();
}
