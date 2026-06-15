import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getClient,
  updateClient,
  deleteClient,
  saveKnowledgeBase,
  crawlWebsite,
  getConversations,
  getConversationMessages,
  createCheckout,
  createBillingPortal,
  setPortalPassword,
  WIDGET_ORIGIN,
  PORTAL_ORIGIN,
} from '../api.js';
import ClientForm from '../components/ClientForm.jsx';
import { StatusBadge, PlanBadge, Button, Notice, inputClass, Field } from '../components/ui.jsx';

const TABS = ['Settings', 'Knowledge base', 'Conversations', 'Billing', 'Portal access', 'Embed code'];

const PLAN_PRICES = { starter: '€149', growth: '€249', pro: '€399' };

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Settings');
  const [flash, setFlash] = useState('');

  useEffect(() => {
    getClient(id).then(setClient).catch((e) => setError(e.message));
  }, [id]);

  // Show a note if the client just came back from Stripe checkout.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('billing') === 'success') {
      flashMessage("Checkout complete — status switches to Active once Stripe confirms the payment.");
    }
  }, []);

  function flashMessage(text) {
    setFlash(text);
    setTimeout(() => setFlash(''), 3000);
  }

  async function handleUpdate(form) {
    const updated = await updateClient(id, form);
    setClient({ ...client, ...updated });
    flashMessage('Settings saved.');
  }

  async function handleStatusChange(e) {
    const status = e.target.value;
    const updated = await updateClient(id, { status });
    setClient({ ...client, ...updated });
    flashMessage(`Status changed to ${status}.`);
  }

  async function handleDelete() {
    const sure = window.confirm(
      `Delete ${client.name} permanently?\n\nThis wipes their knowledge base, all conversations and all leads. This cannot be undone.`
    );
    if (!sure) return;
    await deleteClient(id);
    navigate('/clients');
  }

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!client) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <Link to="/clients" className="text-sm text-slate-500 hover:text-slate-700">&larr; Back to clients</Link>

      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
        <PlanBadge plan={client.plan} />
        <StatusBadge status={client.status} />
        <div className="ml-auto flex items-center gap-2">
          <select value={client.status} onChange={handleStatusChange} className={inputClass + ' !w-auto'}>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      {flash && <div className="mb-4"><Notice>{flash}</Notice></div>}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'px-4 py-2 text-sm font-medium -mb-px border-b-2 ' +
              (tab === t
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {tab === 'Settings' && (
          <ClientForm key={client.updated_at} initial={client} onSubmit={handleUpdate} submitLabel="Save settings" />
        )}
        {tab === 'Knowledge base' && (
          <KnowledgeTab client={client} onSaved={() => flashMessage('Knowledge base saved.')} />
        )}
        {tab === 'Conversations' && <ConversationsTab client={client} />}
        {tab === 'Billing' && <BillingTab client={client} />}
        {tab === 'Portal access' && <PortalAccessTab client={client} />}
        {tab === 'Embed code' && <EmbedTab client={client} />}
      </div>
    </div>
  );
}

function KnowledgeTab({ client, onSaved }) {
  const [content, setContent] = useState(client.knowledge_bases?.content ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [crawlUrl, setCrawlUrl] = useState(client.domain ?? '');
  const [crawling, setCrawling] = useState(false);
  const [crawlNote, setCrawlNote] = useState('');

  async function handleSave() {
    setBusy(true);
    setError('');
    try {
      await saveKnowledgeBase(client.id, content);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const hasContent = content.trim().length > 0;

  async function handleCrawl() {
    if (
      hasContent &&
      !window.confirm(
        'This will crawl the website and REPLACE the current knowledge base with the text it finds. Continue?'
      )
    ) {
      return;
    }
    setCrawling(true);
    setError('');
    setCrawlNote('');
    try {
      const result = await crawlWebsite(client.id, crawlUrl);
      setContent(result.content); // already saved server-side
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
        Everything the bot knows about this business. Plain text works best — paste in their
        services, prices, opening hours, FAQs, policies. The bot will only answer from what's here.
      </p>

      {/* Auto-import from the client's website */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-medium text-slate-700">Import from website</div>
        <p className="mt-1 text-xs text-slate-500">
          Crawl the client's site and turn its pages into the knowledge base automatically.
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
        {crawling && (
          <p className="mt-2 text-xs text-slate-500">Reading the website… this can take up to a minute.</p>
        )}
        {crawlNote && <p className="mt-2 text-xs text-emerald-600">{crawlNote}</p>}
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      <textarea
        className={inputClass + ' font-mono !text-[13px] leading-relaxed'}
        rows={16}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={'Example:\n\nMurphy\'s Plumbing — Dublin\nEmergency callouts 24/7.\nStandard callout fee: €90.\nServices: leak repair, boiler servicing (from €120), bathroom installs...'}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{content.length.toLocaleString()} characters</span>
        <Button onClick={handleSave} disabled={busy}>{busy ? 'Saving…' : 'Save knowledge base'}</Button>
      </div>
    </div>
  );
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-IE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ConversationsTab({ client }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // conversation id
  const [transcript, setTranscript] = useState(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  useEffect(() => {
    getConversations(client.id).then(setList).catch((e) => setError(e.message));
  }, [client.id]);

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
    return (
      <p className="text-sm text-slate-500">
        No conversations yet. Once visitors start chatting with this client's bot, every
        chat will appear here.
      </p>
    );
  }

  const onBrand = client.brand_color;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
      {/* List of conversations */}
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
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Lead
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-400">{c.session_id}</div>
          </button>
        ))}
      </div>

      {/* Transcript of the selected conversation */}
      <div className="min-h-[300px] rounded-lg border border-slate-200 bg-slate-50 p-4">
        {!selected && (
          <p className="text-sm text-slate-400">Select a conversation to read the full chat.</p>
        )}
        {loadingTranscript && <p className="text-sm text-slate-400">Loading…</p>}
        {transcript && (
          <div className="flex flex-col gap-2">
            {transcript.map((m, i) => (
              <div
                key={i}
                className={
                  'max-w-[80%] rounded-2xl px-3 py-2 text-sm ' +
                  (m.role === 'visitor'
                    ? 'self-end text-white'
                    : 'self-start bg-white text-slate-800 border border-slate-200')
                }
                style={m.role === 'visitor' ? { background: onBrand } : undefined}
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

function PortalAccessTab({ client }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const hasEmail = Boolean(client.contact_email);

  async function save() {
    setBusy(true);
    setError('');
    setDone(false);
    try {
      await setPortalPassword(client.id, password);
      setDone(true);
      setPassword('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-slate-500">
        Your client logs into their own portal to see their stats, conversations and leads,
        and to edit their knowledge base. They sign in with their <strong>contact email</strong>{' '}
        and the password you set here.
      </p>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="text-slate-500">Portal address</div>
        <a href={PORTAL_ORIGIN} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 hover:underline">
          {PORTAL_ORIGIN}
        </a>
        <div className="mt-3 text-slate-500">Login email</div>
        <div className="font-medium text-slate-800">
          {client.contact_email || <span className="text-orange-600">No contact email set — add one in Settings first.</span>}
        </div>
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      {done && <Notice>Password set. Send your client their email + the new password.</Notice>}

      <Field label="Set / reset portal password" hint="At least 8 characters. Setting a new one replaces any existing password.">
        <input
          className={inputClass}
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="e.g. a memorable phrase you share with them"
          disabled={!hasEmail}
        />
      </Field>
      <Button onClick={save} disabled={busy || !hasEmail || password.length < 8}>
        {busy ? 'Saving…' : 'Set password'}
      </Button>
    </div>
  );
}

function BillingTab({ client }) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const subscribed = Boolean(client.stripe_subscription_id);

  async function generateCheckout() {
    setBusy(true);
    setError('');
    setLink('');
    try {
      const { url } = await createCheckout(client.id);
      setLink(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setError('');
    try {
      const { url } = await createBillingPortal(client.id);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm text-slate-500">Current plan</div>
        <div className="text-lg font-semibold capitalize text-slate-900">
          {client.plan} — {PLAN_PRICES[client.plan]}/month
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
          Status: <StatusBadge status={client.status} />
        </div>
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      {!subscribed ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Generate a secure Stripe checkout link to start this client's {client.plan} subscription,
            then send it to them. Once they pay, their status switches to Active automatically.
          </p>
          <Button onClick={generateCheckout} disabled={busy}>
            {busy ? 'Generating…' : 'Generate checkout link'}
          </Button>
          {link && (
            <div className="flex items-stretch gap-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
                className={inputClass}
              />
              <Button variant="secondary" onClick={copyLink}>{copied ? 'Copied ✓' : 'Copy'}</Button>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Open
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            This client has a Stripe subscription. Open the billing portal to update their card,
            change plan, or cancel.
          </p>
          <Button onClick={openPortal} disabled={busy}>{busy ? 'Opening…' : 'Manage billing'}</Button>
        </div>
      )}
    </div>
  );
}

function EmbedTab({ client }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="${WIDGET_ORIGIN}/widget/${client.id}"></script>`;
  const demoUrl = `${WIDGET_ORIGIN}/demo/${client.id}`;

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        The client (or their web person) pastes this single line into their website's HTML,
        just before the closing <code className="rounded bg-slate-100 px-1">&lt;/body&gt;</code> tag.
        The chat bubble appears instantly — no other setup.
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
        — a pretend website with this client's bot already on it.
      </p>
    </div>
  );
}
