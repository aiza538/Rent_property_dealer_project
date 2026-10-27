const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('rent_aasan_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (data && data.detail) {
      if (typeof data.detail === 'string') {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        // FastAPI validation errors (422) come back as a list of objects.
        // Rendering that list directly shows "[object Object]", so turn
        // each entry into a readable "field: message" line instead.
        message = data.detail
          .map((e) => {
            const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : null;
            return field ? `${field}: ${e.msg}` : e.msg || JSON.stringify(e);
          })
          .join('; ');
      }
    }
    throw new Error(message);
  }
  return data;
}
