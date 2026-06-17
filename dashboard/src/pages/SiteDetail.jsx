import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getSite,
  updateSite,
  deleteSite,
  saveSiteKnowledgeBase,
  crawlSiteWebsite,
  getSiteConversations,
  getConversationMessages,
  WIDGET_ORIGIN,
} from '../api.js';
import SiteForm from '../components/SiteForm.jsx';
import { Button, Notice, inputClass } from '../components/ui.jsx';

const TABS = ['Settings', 'Knowledge base', 'Conversations', 'Embed code'];

export default function SiteDetail() {
  const { id: clientId, siteId } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Settings');
  const [flash, setFlash] = useState('');

  useEffect(() => {
    getSite(siteId).then(setSite).catch((e) => setError(e.message));
  }, [siteId]);

  function flashMessage(text) {
    setFlash(text);
    setTimeout(() => setFlash(''), 3000);
  }

  async function handleUpdate(form) {
    const updated = await updateSite(siteId, form);
    setSite({ ...site, ...updated });
    flashMessage('Site saved.');
  }

  async function handleDelete() {
    if (!window.confirm(`Delete the site "${site.name}"?\n\nThis wipes its knowledge base, conversations and leads. This cannot be undone.`)) return;
    await deleteSite(siteId);
    navigate(`/clients/${clientId}`);
  }

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!site) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <Link to={`/clients/${clientId}`} className="text-sm text-slate-500 hover:text-slate-700">&larr; Back to account</Link>

      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <span className="inline-block h-4 w-4 rounded-full" style={{ background: site.brand_color }} />
        <h1 className="text-2xl font-bold text-slate-900">{site.name}</h1>
        <Button variant="danger" onClick={handleDelete} >Delete site</Button>
      </div>

      {flash && <div className="mb-4"><Notice>{flash}</Notice></div>}

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'px-4 py-2 text-sm font-medium -mb-px border-b-2 ' +
              (tab === t ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {tab === 'Settings' && (
          <SiteForm key={site.updated_at} initial={site} onSubmit={handleUpdate} submitLabel="Save site" />
        )}
        {tab === 'Knowledge base' && (
          <KnowledgeTab site={site} onSaved={() => flashMessage('Knowledge base saved.')} />
        )}
        {tab === 'Conversations' && <ConversationsTab site={site} />}
        {tab === 'Embed code' && <EmbedTab site={site} />}
      </div>
    </div>
  );
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-IE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function KnowledgeTab({ site, onSaved }) {
  const [content, setContent] = useState(site.knowledge_bases?.content ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [crawlUrl, setCrawlUrl] = useState(site.domain ?? '');
  const [crawling, setCrawling] = useState(false);
  const [crawlNote, setCrawlNote] = useState('');

  async function handleSave() {
    setBusy(true);
    setError('');
    try {
      await saveSiteKnowledgeBase(site.id, content);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const hasContent = content.trim().length > 0;

  async function handleCrawl() {
    if (hasContent && !window.confirm('This will crawl the website and REPLACE the current knowledge base with the text it finds. Continue?')) return;
    setCrawling(true);
    setError('');
    setCrawlNote('');
    try {
      const result = await crawlSiteWebsite(site.id, crawlUrl);
      setContent(result.content);
      setCrawlNote(
        `Imported ${result.pagesCrawled} page${result.pagesCrawled === 1 ? '' : 's'} ` +
          `(${result.characters.toLocaleString()} characters)${result.truncated ? ', trimmed to fit' : ''} — saved.`
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setCrawling(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Everything this site's bot knows. Plain text works best — services, prices, opening hours,
        FAQs, policies. The bot only answers from what's here.
      </p>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-medium text-slate-700">Import from website</div>
        <p className="mt-1 text-xs text-slate-500">
          Crawl this site's website and turn its pages into the knowledge base automatically.
          Run it again any time to refresh. (Up to 25 pages.)
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className={inputClass + ' flex-1 min-w-[220px]'}
            value={crawlUrl}
            onChange={(e) => setCrawlUrl(e.target.value)}
            placeholder="murphysplumbing.ie"
            disabled={crawling}
          />
          <Button onClick={handleCrawl} disabled={crawling || !crawlUrl.trim()}>
            {crawling ? 'Crawling…' : hasContent ? 'Re-crawl & refresh' : 'Crawl & import'}
          </Button>
        </div>
        {crawling && <p className="mt-2 text-xs text-slate-500">Reading the website… this can take up to a minute.</p>}
        {crawlNote && <p className="mt-2 text-xs text-emerald-600">{crawlNote}</p>}
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      <textarea
        className={inputClass + ' font-mono !text-[13px] leading-relaxed'}
        rows={16}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{content.length.toLocaleString()} characters</span>
        <Button onClick={handleSave} disabled={busy}>{busy ? 'Saving…' : 'Save knowledge base'}</Button>
      </div>
    </div>
  );
}

function ConversationsTab({ site }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  useEffect(() => {
    getSiteConversations(site.id).then(setList).catch((e) => setError(e.message));
  }, [site.id]);

  function openConversation(id) {
    setSelected(id);
    setTranscript(null);
    setLoadingTranscript(true);
    getConversationMessages(id)
      .then((data) => setTranscript(data.messages))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingTranscript(false));
  }

  if (error) return <Notice kind="error">{error}</Notice>;
  if (list === null) return <p className="text-slate-500">Loading conversations…</p>;
  if (list.length === 0) {
    return <p className="text-sm text-slate-500">No conversations yet. Chats with this site's bot will appear here.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
      <div className="max-h-[460px] overflow-y-auto rounded-lg border border-slate-200">
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => openConversation(c.id)}
            className={
              'block w-full border-b border-slate-100 px-3 py-2.5 text-left text-sm last:border-0 ' +
              (selected === c.id ? 'bg-emerald-50' : 'hover:bg-slate-50')
            }
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">{formatWhen(c.last_message_at)}</span>
              {c.has_lead && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Lead</span>
              )}
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-400">{c.session_id}</div>
          </button>
        ))}
      </div>

      <div className="min-h-[300px] rounded-lg border border-slate-200 bg-slate-50 p-4">
        {!selected && <p className="text-sm text-slate-400">Select a conversation to read the full chat.</p>}
        {loadingTranscript && <p className="text-sm text-slate-400">Loading…</p>}
        {transcript && (
          <div className="flex flex-col gap-2">
            {transcript.map((m, i) => (
              <div
                key={i}
                className={
                  'max-w-[80%] rounded-2xl px-3 py-2 text-sm ' +
                  (m.role === 'visitor' ? 'self-end text-white' : 'self-start bg-white text-slate-800 border border-slate-200')
                }
                style={m.role === 'visitor' ? { background: site.brand_color } : undefined}
              >
                {m.content}
                <div className={'mt-1 text-[10px] ' + (m.role === 'visitor' ? 'text-white/70' : 'text-slate-400')}>
                  {formatWhen(m.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmbedTab({ site }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="${WIDGET_ORIGIN}/widget/${site.id}"></script>`;
  const demoUrl = `${WIDGET_ORIGIN}/demo/${site.id}`;

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Paste this single line into this site's website HTML, just before the closing{' '}
        <code className="rounded bg-slate-100 px-1">&lt;/body&gt;</code> tag. Each site has its own
        unique embed code.
      </p>
      <div className="flex items-stretch gap-2">
        <pre className="flex-1 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-sm text-emerald-300">{snippet}</pre>
        <Button variant="secondary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</Button>
      </div>
      <p className="text-sm text-slate-500">
        Want to see it live first?{' '}
        <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 hover:underline">
          Open the demo page
        </a>{' '}
        — a pretend website with this site's bot on it.
      </p>
    </div>
  );
}
