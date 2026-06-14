import { useEffect, useState } from 'react';
import { getToken, getMe, clearToken } from './api.js';
import Login from './pages/Login.jsx';
import PortalHome from './pages/PortalHome.jsx';

export default function App() {
  const [me, setMe] = useState(null);
  const [checking, setChecking] = useState(true);

  // On load, if there's a saved token, confirm it still works.
  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    getMe()
      .then(setMe)
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  function handleLoggedIn(profile) {
    setMe(profile);
  }

  function handleLogout() {
    clearToken();
    setMe(null);
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  if (!me) return <Login onLoggedIn={handleLoggedIn} />;
  return <PortalHome me={me} onLogout={handleLogout} />;
}
