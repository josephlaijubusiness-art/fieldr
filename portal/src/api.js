// Talks to the backend's /api/portal/* endpoints, attaching the login token.

// Empty in dev (Vite proxy forwards to localhost:3001). In production set
// VITE_API_URL on Railway to the backend address, e.g. https://fieldr.ie
const API_URL = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'fieldr_portal_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(API_URL + '/api/portal' + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  // If the token is missing/expired, force a fresh login.
  if (res.status === 401) {
    clearToken();
    if (!path.startsWith('/login')) window.location.reload();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const login = (email, password) =>
  request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getMe = () => request('/me');
export const getStats = () => request('/stats');
export const getConversations = () => request('/conversations');
export const getMessages = (id) => request(`/conversations/${id}/messages`);
export const getLeads = () => request('/leads');
export const getKnowledgeBase = () => request('/knowledge-base');
export const saveKnowledgeBase = (content) =>
  request('/knowledge-base', { method: 'PUT', body: JSON.stringify({ content }) });
