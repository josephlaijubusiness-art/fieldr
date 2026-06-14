import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClients } from '../api.js';
import { PlanBadge, StatusBadge, Notice } from '../components/ui.jsx';

export default function ClientsList() {
  const [clients, setClients] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getClients().then(setClients).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <Link
          to="/clients/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Add client
        </Link>
      </div>

      {error && <Notice kind="error">Could not load clients: {error}</Notice>}
      {!error && clients === null && <p className="text-slate-500">Loading…</p>}

      {clients?.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No clients yet. Add your first one to get started.
        </div>
      )}

      {clients?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Business</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link to={`/clients/${c.id}`} className="font-medium text-slate-900 hover:text-emerald-700">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                        style={{ background: c.brand_color }}
                      />
                      {c.name}
                    </Link>
                    {c.domain && <div className="ml-5 text-xs text-slate-400">{c.domain}</div>}
                  </td>
                  <td className="px-5 py-3"><PlanBadge plan={c.plan} /></td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-slate-500">
                    {new Date(c.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
