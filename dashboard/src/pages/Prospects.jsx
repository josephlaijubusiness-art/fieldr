import { useEffect, useMemo, useState } from 'react';
import { getProspects, updateProspect, generateProspectEmail } from '../api.js';
import { Button, Notice, inputClass } from '../components/ui.jsx';

const TYPE_LABELS = {
  gym: 'Gym',
  car_dealer: 'Car dealer',
  restaurant: 'Restaurant',
  solicitor: 'Solicitor',
  accountant: 'Accountant',
  beauty_salon: 'Beauty salon',
};

const STATUS_STYLES = {
  new: 'bg-slate-200 text-slate-700',
  contacted: 'bg-sky-100 text-sky-700',
  replied: 'bg-emerald-100 text-emerald-700',
};

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

// Convert a stored ISO timestamp to a yyyy-mm-dd value for <input type=date>.
function toDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d) ? '' : d.toISOString().slice(0, 10);
}

export default function Prospects() {
  const [prospects, setProspects] = useState(null);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [emailFor, setEmailFor] = useState(null); // prospect being emailed

  useEffect(() => {
    getProspects().then(setProspects).catch((e) => setError(e.message));
  }, []);

  const stats = useMemo(() => {
    const list = prospects || [];
    const contacted = list.filter((p) => p.status === 'contacted' || p.status === 'replied').length;
    const replied = list.filter((p) => p.status === 'replied').length;
    return {
      total: list.length,
      contacted,
      replied,
      replyRate: contacted ? Math.round((replied / contacted) * 100) : 0,
    };
  }, [prospects]);

  function patchLocal(updated) {
    setProspects((list) => list.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function changeStatus(p, status) {
    try {
      patchLocal({ ...p, status }); // optimistic
      const updated = await updateProspect(p.id, { status });
      patchLocal(updated);
    } catch (e) {
      setError(e.message);
    }
  }

  async function changeFollowup(p, value) {
    const iso = value ? new Date(value).toISOString() : null;
    try {
      const updated = await updateProspect(p.id, { followup_date: iso });
      patchLocal(updated);
    } catch (e) {
      setError(e.message);
    }
  }

  if (error && !prospects) return <Notice kind="error">{error}{/relation|table|schema/i.test(error) && <> — run <code className="rounded bg-red-100 px-1">database/add-prospects.sql</code> in Supabase.</>}</Notice>;
  if (prospects === null) return <p className="text-slate-500">Loading…</p>;

  const visible =
    typeFilter === 'all' ? prospects : prospects.filter((p) => p.type === typeFilter);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Prospects</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total prospects" value={stats.total} />
        <StatCard label="Contacted" value={stats.contacted} />
        <StatCard label="Replied" value={stats.replied} />
        <StatCard label="Reply rate" value={`${stats.replyRate}%`} />
      </div>

      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}

      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm text-slate-500">Filter:</label>
        <select className={inputClass + ' !w-auto'} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {Object.entries(TYPE_LABELS).map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <span className="text-sm text-slate-400">{visible.length} shown</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Follow-up</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{p.name}</div>
                  {p.email && (
                    <a href={`mailto:${p.email}`} className="text-xs text-emerald-700 hover:underline">{p.email}</a>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[p.type] || p.type}</td>
                <td className="px-4 py-3 text-slate-600">{p.contact || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={p.status}
                    onChange={(e) => changeStatus(p, e.target.value)}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[p.status] || 'bg-slate-200'}`}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="replied">Replied</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="date"
                    value={toDateInput(p.followup_date)}
                    onChange={(e) => changeFollowup(p, e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="secondary" onClick={() => setEmailFor(p)}>Generate email</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {emailFor && (
        <EmailModal
          prospect={emailFor}
          onClose={() => setEmailFor(null)}
          onMarkedContacted={(updated) => { patchLocal(updated); }}
        />
      )}
    </div>
  );
}

function EmailModal({ prospect, onClose, onMarkedContacted }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState(null); // { to, subject, body }
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError('');
    try {
      setEmail(await generateProspectEmail(prospect.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { generate(); /* eslint-disable-next-line */ }, []);

  function copyAll() {
    if (!email) return;
    navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const mailto = email
    ? `mailto:${prospect.email || ''}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
    : '#';

  async function markContacted() {
    try {
      const updated = await updateProspect(prospect.id, { status: 'contacted' });
      onMarkedContacted(updated);
      onClose();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Email to {prospect.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        {loading && <p className="text-sm text-slate-500">Writing a personalised email…</p>}
        {error && <Notice kind="error">{error}</Notice>}

        {email && !loading && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">To</div>
              <div className="text-sm text-slate-800">{prospect.email || '— no email on file —'}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Subject</div>
              <div className="text-sm font-medium text-slate-900">{email.subject}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Body</div>
              <textarea
                readOnly
                value={email.body}
                rows={12}
                className={inputClass + ' mt-1 text-[13px] leading-relaxed'}
                onFocus={(e) => e.target.select()}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={copyAll}>{copied ? 'Copied ✓' : 'Copy email'}</Button>
              {prospect.email && (
                <a href={mailto} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  Open in email
                </a>
              )}
              <Button variant="secondary" onClick={generate}>Regenerate</Button>
              <Button onClick={markContacted}>Mark contacted</Button>
            </div>
            <p className="text-xs text-slate-400">
              AI-written — give it a quick read before sending, and double-check the address is correct.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
