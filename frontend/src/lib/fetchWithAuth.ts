
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];
const inFlightRequests = new Map<string, Promise<{ data: any; ok: boolean; status: number }>>();

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(logout?: () => void): Promise<string> {
  const refreshToken = localStorage.getItem('refresh');
  if (!refreshToken) {
    if (logout) logout();
    throw new Error('No refresh token available');
  }

  if (isRefreshing) {
    return new Promise(resolve => subscribeTokenRefresh(resolve));
  }

  isRefreshing = true;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!res.ok) {
      if (logout) logout();
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
  init: RequestInit = {},
  logout?: () => void
): Promise<{ data: any; ok: boolean; status: number }> {
  const key = typeof input === 'string' ? input : JSON.stringify(input);

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const fetchPromise = (async () => {
    let accessToken = localStorage.getItem('access');
    const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

    let response = await fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
        ...authHeaders,
      },
    });

    if (response.status === 401 && accessToken) {
      try {
        accessToken = await refreshAccessToken(logout);
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
        if (logout) logout();
        throw err;
      }
    }

    const data = await response.json();
    return { data, ok: response.ok, status: response.status };
  })();

  inFlightRequests.set(key, fetchPromise);

  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(key);
  }
}
