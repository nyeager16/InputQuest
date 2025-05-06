// lib/fetchWithAuth.ts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise(resolve => subscribeTokenRefresh(resolve));
  }

  isRefreshing = true;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: localStorage.getItem('refresh') }),
    });

    if (!res.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await res.json();
    localStorage.setItem('access', data.access);
    onRefreshed(data.access);
    return data.access;
  } finally {
    isRefreshing = false;
  }
}

export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  let accessToken = localStorage.getItem('access');

  const authHeaders = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  let response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      ...authHeaders,
    },
  });

  if (response.status === 401) {
    try {
      accessToken = await refreshAccessToken();

      response = await fetch(input, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      console.error('Token refresh failed', err);
      throw err;
    }
  }

  return response;
}
