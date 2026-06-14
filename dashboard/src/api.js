// All conversations between the dashboard and the backend go through here.

// In development this is empty, so requests go to "/api/..." and Vite's proxy
// forwards them to localhost:3001. In production we set VITE_API_URL (at build
// time on Railway) to the backend's address, e.g. https://fieldr.ie
const API_URL = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'fieldr_admin_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(API_URL + '/api' + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  // A 401 anywhere means the session is gone — drop the token and the app
  // will show the login screen again. (Don't do this for the login call
  // itself, which 401s simply for a wrong password.)
  if (res.status === 401 && !path.startsWith('/admin/login')) {
    clearToken();
    window.location.reload();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const adminLogin = (email, password) =>
  request('/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getAdminMe = () => request('/admin/me');

export const getClients = () => request('/clients');
export const getClient = (id) => request(`/clients/${id}`);
export const createClient = (body) =>
  request('/clients', { method: 'POST', body: JSON.stringify(body) });
export const updateClient = (id, body) =>
  request(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteClient = (id) => request(`/clients/${id}`, { method: 'DELETE' });
export const getKnowledgeBase = (id) => request(`/clients/${id}/knowledge-base`);
export const saveKnowledgeBase = (id, content) =>
  request(`/clients/${id}/knowledge-base`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });

export const getOverview = () => request('/stats/overview');
export const getContactRequests = () => request('/contact');
export const updateContactRequest = (id, handled) =>
  request(`/contact/${id}`, { method: 'PATCH', body: JSON.stringify({ handled }) });
export const createCheckout = (id) =>
  request(`/billing/${id}/checkout`, { method: 'POST' });
export const createBillingPortal = (id) =>
  request(`/billing/${id}/portal`, { method: 'POST' });
export const setPortalPassword = (id, password) =>
  request(`/clients/${id}/portal-password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });

// Where the client portal lives (for the "Portal access" tab link).
// Dev: its own Vite port. Prod: set VITE_PORTAL_URL on Railway.
export const PORTAL_ORIGIN =
  import.meta.env.VITE_PORTAL_URL || 'http://localhost:5174';
export const getConversations = (clientId) =>
  request(`/clients/${clientId}/conversations`);
export const getConversationMessages = (conversationId) =>
  request(`/conversations/${conversationId}/messages`);

// Where the widget + demo pages are served from — that's the BACKEND (it serves
// /widget/:id). Dev: localhost:3001. Prod: VITE_API_URL (e.g. https://fieldr.ie).
export const WIDGET_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
