export async function refreshAccessToken() {
  const res = await fetch('/token/refresh/', {
    method: 'POST',
    credentials: 'include', // sends cookies
  });

  if (res.ok) {
    const data = await res.json();
    return data.access; // new access token
  } else {
    throw new Error('Refresh failed');
  }
}
