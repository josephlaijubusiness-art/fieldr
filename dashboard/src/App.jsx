import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { getToken, getAdminMe, clearToken } from './api.js';
import AdminLogin from './pages/AdminLogin.jsx';
import Overview from './pages/Overview.jsx';
import ClientsList from './pages/ClientsList.jsx';
import NewClient from './pages/NewClient.jsx';
import ClientDetail from './pages/ClientDetail.jsx';
import SiteDetail from './pages/SiteDetail.jsx';
import ContactRequests from './pages/ContactRequests.jsx';

const navLinkClass = ({ isActive }) =>
  'block rounded-lg px-3 py-2 text-sm font-medium ' +
  (isActive
    ? 'bg-slate-700 text-white'
    : 'text-slate-300 hover:bg-slate-800 hover:text-white');

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  // On load, if there's a saved token, confirm it still works.
  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    getAdminMe()
      .then(() => setAuthed(true))
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  function handleLogout() {
    clearToken();
    setAuthed(false);
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  if (!authed) return <AdminLogin onLoggedIn={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-5 py-5 text-xl font-bold tracking-tight">
          Fieldr<span className="text-emerald-400">.</span>
        </div>
        <nav className="px-3 space-y-1">
          <NavLink to="/overview" className={navLinkClass}>
            Overview
          </NavLink>
          <NavLink to="/clients" className={navLinkClass}>
            Clients
          </NavLink>
          <NavLink to="/contact-requests" className={navLinkClass}>
            Contact requests
          </NavLink>
        </nav>
        <div className="mt-auto px-5 py-4">
          <button
            onClick={handleLogout}
            className="mb-3 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Log out
          </button>
          <div className="px-2 text-xs text-slate-500">app.fieldr.ie</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 max-w-5xl">
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/clients" element={<ClientsList />} />
          <Route path="/clients/new" element={<NewClient />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/clients/:id/sites/:siteId" element={<SiteDetail />} />
          <Route path="/contact-requests" element={<ContactRequests />} />
        </Routes>
      </main>
    </div>
  );
}
