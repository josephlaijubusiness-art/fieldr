import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getClient,
  updateClient,
  deleteClient,
  getSites,
  createSite,
  createCheckout,
  createBillingPortal,
  setPortalPassword,
  PORTAL_ORIGIN,
} from '../api.js';
import ClientForm from '../components/ClientForm.jsx';
import SiteForm from '../components/SiteForm.jsx';
import { StatusBadge, PlanBadge, Button, Notice, inputClass, Field } from '../components/ui.jsx';

const TABS = ['Sites', 'Account', 'Billing', 'Portal access'];

function maxSitesForPlan(plan) {
  return plan === 'pro' ? 3 : 1;
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Sites');
  const [flash, setFlash] = useState('');

  useEffect(() => {
    getClient(id).then(setClient).catch((e) => setError(e.message));
  }, [id]);

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
    flashMessage('Account saved.');
  }

  async function handleStatusChange(e) {
    const status = e.target.value;
    const updated = await updateClient(id, { status });
    setClient({ ...client, ...updated });
    flashMessage(`Status changed to ${status}.`);
  }

  async function handleDelete() {
    const sure = window.confirm(
      `Delete ${client.name} permanently?\n\nThis wipes ALL their sites, knowledge bases, conversations and leads. This cannot be undone.`
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
        {tab === 'Sites' && <SitesTab client={client} />}
        {tab === 'Account' && (
          <ClientForm key={client.updated_at} initial={client} onSubmit={handleUpdate} submitLabel="Save account" />
        )}
        {tab === 'Billing' && <BillingTab client={client} />}
        {tab === 'Portal access' && <PortalAccessTab client={client} />}
      </div>
    </div>
  );
}

function SitesTab({ client }) {
  const [sites, setSites] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getSites(client.id).then(setSites).catch((e) => setError(e.message));
  }, [client.id]);

  const max = maxSitesForPlan(client.plan);
  const atLimit = sites && sites.length >= max;

  async function handleAdd(form) {
    const site = await createSite(client.id, form);
    navigate(`/clients/${client.id}/sites/${site.id}`);
  }

  if (error) return <Notice kind="error">{error}</Notice>;
  if (sites === null) return <p className="text-slate-500">Loading sites…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {sites.length} of {max} site{max === 1 ? '' : 's'} used
          {client.plan !== 'pro' && ' — upgrade to Pro for up to 3.'}
        </p>
        {!adding && (
          <Button onClick={() => setAdding(true)} disabled={atLimit}>
            + Add site
          </Button>
        )}
      </div>

      {atLimit && !adding && (
        <Notice kind="error">
          This {client.plan} plan allows {max} site{max === 1 ? '' : 's'}.
          {client.plan !== 'pro' && ' Change the plan to Pro (Account tab) to add more.'}
        </Notice>
      )}

      {adding && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">New site</h3>
            <button onClick={() => setAdding(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
          <SiteForm onSubmit={handleAdd} submitLabel="Create site" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {sites.map((s) => (
          <Link
            key={s.id}
            to={`/clients/${client.id}/sites/${s.id}`}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-emerald-400 hover:shadow-sm"
          >
            <span className="inline-block h-4 w-4 shrink-0 rounded-full" style={{ background: s.brand_color }} />
            <div className="min-w-0">
              <div className="font-medium text-slate-900">{s.name}</div>
              <div className="truncate text-xs text-slate-400">{s.domain || 'No website set'}</div>
            </div>
            <span className="ml-auto text-sm text-emerald-700">Manage →</span>
          </Link>
        ))}
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
        Your client logs into their own portal to see stats, conversations and leads, and to edit
        their knowledge base — across all their sites. They sign in with their{' '}
        <strong>contact email</strong> and the password you set here.
      </p>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="text-slate-500">Portal address</div>
        <a href={PORTAL_ORIGIN} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 hover:underline">
          {PORTAL_ORIGIN}
        </a>
        <div className="mt-3 text-slate-500">Login email</div>
        <div className="font-medium text-slate-800">
          {client.contact_email || <span className="text-orange-600">No contact email set — add one in the Account tab first.</span>}
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
        <div className="text-sm text-slate-500">Plan</div>
        <div className="text-lg font-semibold capitalize text-slate-900">{client.plan}</div>
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
              <input readOnly value={link} onFocus={(e) => e.target.select()} className={inputClass} />
              <Button variant="secondary" onClick={copyLink}>{copied ? 'Copied ✓' : 'Copy'}</Button>
              <a href={link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Open</a>
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
