import { useEffect, useState } from 'react';
import { getContactRequests, updateContactRequest } from '../api.js';
import { Button, Notice } from '../components/ui.jsx';

function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function ContactRequests() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    getContactRequests().then(setRequests).catch((e) => setError(e.message));
  }, []);

  async function toggle(req) {
    setSavingId(req.id);
    try {
      const updated = await updateContactRequest(req.id, !req.handled);
      setRequests((rs) => rs.map((r) => (r.id === req.id ? updated : r)));
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  const newCount = requests?.filter((r) => !r.handled).length ?? 0;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Contact requests</h1>
        {newCount > 0 && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {newCount} new
          </span>
        )}
      </div>

      {error && (
        <Notice kind="error">
          {error}
          {/relation|table|schema cache/i.test(error) && (
            <> — run <code className="rounded bg-red-100 px-1">database/add-contact-requests.sql</code> in Supabase to create the table.</>
          )}
        </Notice>
      )}

      {!error && requests === null && <p className="text-slate-500">Loading…</p>}

      {requests?.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No demo requests yet. They'll appear here when someone fills in the form on fieldr.ie.
        </div>
      )}

      {requests?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Business</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Message</th>
                <th className="px-5 py-3 whitespace-nowrap">Submitted</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className={r.handled ? 'bg-slate-50/60 text-slate-400' : 'hover:bg-slate-50'}>
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {!r.handled && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />}
                    <span className={r.handled ? 'text-slate-500' : ''}>{r.name}</span>
                  </td>
                  <td className="px-5 py-3">{r.business || '—'}</td>
                  <td className="px-5 py-3">
                    <a href={`mailto:${r.email}`} className="text-emerald-700 hover:underline">{r.email}</a>
                  </td>
                  <td className="px-5 py-3 max-w-xs whitespace-pre-wrap break-words text-slate-600">{r.message || '—'}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-slate-500">{formatWhen(r.created_at)}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <Button
                      variant={r.handled ? 'secondary' : 'primary'}
                      onClick={() => toggle(r)}
                      disabled={savingId === r.id}
                    >
                      {savingId === r.id ? '…' : r.handled ? 'Mark as new' : 'Mark contacted'}
                    </Button>
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
