import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOverview } from '../api.js';
import { PlanBadge, StatusBadge, Notice } from '../components/ui.jsx';

const euro = (n) =>
  n.toLocaleString('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getOverview().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Notice kind="error">Could not load overview: {error}</Notice>;
  if (!data) return <p className="text-slate-500">Loading…</p>;

  const { mrr, totals, clients } = data;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Overview</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Monthly recurring revenue"
          value={euro(mrr)}
          sub={`from ${totals.active} active client${totals.active === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Clients"
          value={totals.clients}
          sub={`${totals.active} active`}
        />
        <StatCard label="Total chats" value={totals.conversations.toLocaleString()} />
        <StatCard label="Leads captured" value={totals.leads.toLocaleString()} />
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold text-slate-900">Per-client breakdown</h2>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No clients yet. <Link to="/clients/new" className="text-emerald-700 hover:underline">Add your first one.</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Business</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Chats</th>
                <th className="px-5 py-3 text-right">Leads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link to={`/clients/${c.id}`} className="font-medium text-slate-900 hover:text-emerald-700">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3"><PlanBadge plan={c.plan} /></td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">{c.conversations.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">{c.leads.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
