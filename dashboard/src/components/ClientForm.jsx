import { useState } from 'react';
import { Field, inputClass, Button } from './ui.jsx';

// Account-level form (add / edit a client). Branding now lives on each site,
// so it's edited per-site, not here.

const EMPTY = {
  name: '',
  contact_email: '',
  plan: 'starter',
};

export default function ClientForm({ initial, onSubmit, submitLabel = 'Save' }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Business name *">
          <input className={inputClass} value={form.name} onChange={set('name')} required placeholder="Murphy's Plumbing" />
        </Field>
        <Field label="Contact email" hint="Also their login for the client portal">
          <input className={inputClass} type="email" value={form.contact_email ?? ''} onChange={set('contact_email')} placeholder="info@murphysplumbing.ie" />
        </Field>
        <Field label="Plan" hint="Starter & Growth: 1 site. Pro: up to 3 sites.">
          <select className={inputClass} value={form.plan} onChange={set('plan')}>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
          </select>
        </Field>
      </div>

      <Button type="submit" disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
