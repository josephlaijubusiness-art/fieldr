import { useState } from 'react';
import { Field, inputClass, Button } from './ui.jsx';

// Form for a site's name + widget branding. Used both to add a new site and
// to edit an existing one.

const EMPTY = {
  name: '',
  domain: '',
  brand_color: '#2563EB',
  bot_name: 'Assistant',
  welcome_message: 'Hi! How can I help you today?',
};

export default function SiteForm({ initial, onSubmit, submitLabel = 'Save' }) {
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
        <Field label="Site name *" hint="e.g. 'Galway branch' or 'Main website'">
          <input className={inputClass} value={form.name} onChange={set('name')} required placeholder="Main website" />
        </Field>
        <Field label="Website" hint="Where this site's widget goes, without https://">
          <input className={inputClass} value={form.domain ?? ''} onChange={set('domain')} placeholder="murphysplumbing.ie" />
        </Field>
        <Field label="Bot name" hint="Shown at the top of the chat window">
          <input className={inputClass} value={form.bot_name} onChange={set('bot_name')} />
        </Field>
        <Field label="Brand colour">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.brand_color}
              onChange={set('brand_color')}
              className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1"
            />
            <input className={inputClass} value={form.brand_color} onChange={set('brand_color')} />
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow"
              style={{ background: form.brand_color }}
              title="Bubble preview"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </span>
          </div>
        </Field>
      </div>

      <Field label="Welcome message" hint="The first thing visitors see when they open the chat">
        <textarea className={inputClass} rows={2} value={form.welcome_message} onChange={set('welcome_message')} />
      </Field>

      <Button type="submit" disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
