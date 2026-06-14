// Small shared building blocks so every page looks consistent.

const PLAN_STYLES = {
  starter: 'bg-sky-100 text-sky-700',
  growth: 'bg-violet-100 text-violet-700',
  pro: 'bg-amber-100 text-amber-700',
};

const STATUS_STYLES = {
  trial: 'bg-slate-200 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function PlanBadge({ plan }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PLAN_STYLES[plan] ?? 'bg-slate-200'}`}>
      {plan}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] ?? 'bg-slate-200'}`}>
      {status}
    </span>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

export function Button({ children, variant = 'primary', ...props }) {
  const styles = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  };
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${styles[variant]}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Notice({ kind = 'success', children }) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-red-50 text-red-800 border-red-200',
  };
  return (
    <div className={`rounded-lg border px-4 py-2.5 text-sm ${styles[kind]}`}>{children}</div>
  );
}
