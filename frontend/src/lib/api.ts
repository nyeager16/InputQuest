export async function getUserPreferences() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/preferences/`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error('Failed to fetch user preferences');
  return await res.json();
}

export async function updateUserPreferences(data: {
  queue_CI: number;
  max_clip_length: number;
}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/preferences/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Failed to update user preferences');
  return await res.json();
}

export async function getUserWords() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/userwords/`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error('Failed to fetch user words');
  return await res.json();
}

export async function getCommonVocab() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/commonvocab/`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error('Failed to fetch user words');
  return await res.json();
}

export async function signupUser(formData: {
  username: string;
  email: string;
  password: string;
  password2: string;
}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/signup/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMessage =
      data.detail ||
      data.message ||
      Object.values(data).flat().join(' ') || // extracts all serializer messages
      'Signup failed';
    throw new Error(errorMessage);
  }

  return data;
}

export async function loginUser(formData: {
  username: string;
  password: string;
}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login/`, {
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
