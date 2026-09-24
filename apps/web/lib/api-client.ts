const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
export const API_URL = (configuredApiUrl || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '')).replace(/\/+$/, '');

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);

  // JSON is the default for string request bodies. Leave File, Blob,
  // FormData, and other binary bodies untouched so the browser/server can
  // use the content type required by that endpoint.
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    ...options,
    credentials: 'include',
    headers,
  });
}
