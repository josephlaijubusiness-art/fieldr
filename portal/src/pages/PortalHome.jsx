import { useEffect, useState } from 'react';
import {
  getSites,
  getStats,
  getConversations,
  getMessages,
  getLeads,
  getKnowledgeBase,
  saveKnowledgeBase,
} from '../api.js';

const TABS = ['Overview', 'Conversations', 'Leads', 'Knowledge base'];

export default function PortalHome({ me, onLogout }) {
  const [tab, setTab] = useState('Overview');
  const [sites, setSites] = useState(null);
  const [siteId, setSiteId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getSites()
      .then((list) => {
        setSites(list);
        if (list.length) setSiteId(list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  const site = sites?.find((s) => s.id === siteId) || null;
  const brand = site && /^#[0-9a-fA-F]{6}$/.test(site.brand_color) ? site.brand_color : '#2563EB';

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900">{me.name}</span>
            {/* Site switcher (only shown when there's more than one site) */}
            {sites && sites.length > 1 && (
              <select
                value={siteId || ''}
                onChange={(e) => setSiteId(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            {sites && sites.length === 1 && (
              <span className="text-sm text-slate-400">— {sites[0].name}</span>
            )}
          </div>
          <button onClick={onLogout} className="text-sm text-slate-500 hover:text-slate-800">Log out</button>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 px-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'border-b-2 px-3 py-2 text-sm font-medium ' +
                (tab === t ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700')
              }
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {error && <ErrorBox>{error}</ErrorBox>}
        {sites === null && <p className="text-slate-500">Loading…</p>}
        {sites && sites.length === 0 && (
          <p className="text-sm text-slate-500">No sites set up yet. Your Fieldr account manager will add one.</p>
        )}
        {site && (
          <>
            {tab === 'Overview' && <OverviewTab siteId={site.id} />}
            {tab === 'Conversations' && <ConversationsTab siteId={site.id} brand={brand} />}
            {tab === 'Leads' && <LeadsTab siteId={site.id} />}
            {tab === 'Knowledge base' && <KnowledgeTab siteId={site.id} />}
          </>
        )}
      </main>
    </div>
  );
}

function ErrorBox({ children }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{children}</div>;
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-IE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function OverviewTab({ siteId }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setStats(null);
    getStats(siteId).then(setStats).catch((e) => setError(e.message));
  }, [siteId]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!stats) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Total chats</div>
        <div className="mt-1 text-4xl font-bold text-slate-900">{stats.conversations.toLocaleString()}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Leads captured</div>
        <div className="mt-1 text-4xl font-bold text-slate-900">{stats.leads.toLocaleString()}</div>
      </div>
    </div>
  );
}

function ConversationsTab({ siteId, brand }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setList(null);
    setSelected(null);
    setTranscript(null);
    getConversations(siteId).then(setList).catch((e) => setError(e.message));
  }, [siteId]);

  function open(id) {
    setSelected(id);
    setTranscript(null);
    setLoading(true);
    getMessages(siteId, id)
      .then((d) => setTranscript(d.messages))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (list === null) return <p className="text-slate-500">Loading…</p>;
  if (list.length === 0) return <p className="text-sm text-slate-500">No conversations yet.</p>;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
      <div className="max-h-[460px] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => open(c.id)}
            className={
              'block w-full border-b border-slate-100 px-3 py-2.5 text-left text-sm last:border-0 ' +
              (selected === c.id ? 'bg-emerald-50' : 'hover:bg-slate-50')
            }
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">{formatWhen(c.last_message_at)}</span>
              {c.has_lead && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Lead</span>}
            </div>
          </button>
        ))}
      </div>

      <div className="min-h-[300px] rounded-lg border border-slate-200 bg-white p-4">
        {!selected && <p className="text-sm text-slate-400">Select a conversation to read it.</p>}
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {transcript && (
          <div className="flex flex-col gap-2">
            {transcript.map((m, i) => (
              <div
                key={i}
                className={
                  'max-w-[80%] rounded-2xl px-3 py-2 text-sm ' +
                  (m.role === 'visitor' ? 'self-end text-white' : 'self-start border border-slate-200 bg-slate-50 text-slate-800')
                }
                style={m.role === 'visitor' ? { background: brand } : undefined}
              >
                {m.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LeadsTab({ siteId }) {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setLeads(null);
    getLeads(siteId).then(setLeads).catch((e) => setError(e.message));
  }, [siteId]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (leads === null) return <p className="text-slate-500">Loading…</p>;
  if (leads.length === 0) return <p className="text-sm text-slate-500">No leads captured yet for this site.</p>;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((l, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-800">{l.name || '—'}</td>
              <td className="px-4 py-3 text-slate-800">{l.email || '—'}</td>
              <td className="px-4 py-3 text-slate-800">{l.phone || '—'}</td>
              <td className="px-4 py-3 text-slate-500">{formatWhen(l.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KnowledgeTab({ siteId }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setContent(null);
    getKnowledgeBase(siteId).then((d) => setContent(d.content ?? '')).catch((e) => setError(e.message));
  }, [siteId]);

  async function save() {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await saveKnowledgeBase(siteId, content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (content === null && !error) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        This is what this site's chatbot knows about your business. Keep it accurate — the bot only
        answers from what's here.
      </p>
      {error && <ErrorBox>{error}</ErrorBox>}
      <textarea
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-[13px] leading-relaxed focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        rows={16}
        value={content ?? ''}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{(content ?? '').length.toLocaleString()} characters</span>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
          <button onClick={save} disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
