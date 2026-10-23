import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Inbox, Loader2 } from 'lucide-react';

export const inr = (n?: number | null) => n == null ? 'Not provided' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
export const inrShort = (n: number) => n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${Math.round(n).toLocaleString('en-IN')}`;
export const dt = (d: any) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
export const dtTime = (d: any) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
export const FREQ_LABEL: any = { CUMULATIVE: 'Cumulative (paid at maturity)', MONTHLY: 'Monthly payout', QUARTERLY: 'Quarterly payout', HALF_YEARLY: 'Half-yearly payout', ANNUAL: 'Annual payout' };
export const tenureLabel = (m: number) => m % 12 === 0 ? `${m / 12} year${m / 12 > 1 ? 's' : ''}` : `${m} months`;

const STATUS: any = {
  PENDING_REVIEW: ['Pending review', 'bg-amber-50 text-amber-700 ring-amber-200'],
  APPROVED: ['Approved', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
  REJECTED: ['Rejected', 'bg-red-50 text-red-700 ring-red-200'],
};
export const StatusBadge = ({ status }: { status: string }) => {
  const [l, c] = STATUS[status] || [status, 'bg-slate-100 text-slate-600 ring-slate-200'];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${c}`}>{l}</span>;
};
export const MaturityBadge = ({ f }: { f: any }) => {
  if (f.status !== 'APPROVED') return <span className="text-xs text-slate-400">—</span>;
  const [t, c] = f.maturityStatus === 'EXPIRED' ? [`Matured ${Math.abs(f.daysRemaining)}d ago`, 'text-red-600'] : f.maturityStatus === 'DUE_SOON' ? [`${f.daysRemaining}d left`, 'text-amber-600'] : [`${f.daysRemaining}d left`, 'text-slate-500'];
  return <span className={`text-xs font-medium ${c}`}>{t}</span>;
};

export const Spinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />{label}</div>
);
export const Empty = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center py-12 text-center animate-fade"><Inbox className="mb-3 h-10 w-10 text-slate-300" /><p className="font-medium text-slate-600">{title}</p>{hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}{action && <div className="mt-4">{action}</div>}</div>
);
export const ErrorBox = ({ msg }: { msg: string }) => <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{msg}</div>;
export const PageHeader = ({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-fade-up">
    <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>{sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}</div>{actions}
  </div>
);

export function AnimatedNumber({ value, format = (n: number) => Math.round(n).toLocaleString('en-IN') }: { value: number; format?: (n: number) => string }) {
  const [v, setV] = useState(0); const raf = useRef(0);
  useEffect(() => {
    const start = performance.now(), from = 0;
    const tick = (t: number) => { const p = Math.min(1, (t - start) / 700); setV(from + (value - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{format(v)}</>;
}

export function StatCard({ label, value, to, icon, tone = 'brand', format, delay = 0, hint }: any) {
  const tones: any = { brand: 'bg-brand-50 text-brand-600', amber: 'bg-amber-50 text-amber-600', green: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600', slate: 'bg-slate-100 text-slate-600' };
  const body = (
    <div className={`card p-4 animate-fade-up ${to ? 'card-hover' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><span className={`rounded-lg p-2 ${tones[tone]}`}>{icon}</span></div>
      <p className="mt-2 text-2xl font-semibold text-slate-900"><AnimatedNumber value={value || 0} format={format} /></p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 animate-fade" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className={`relative max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-xl animate-pop ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, error, required, children, hint }: any) => (
  <div><label className="label">{label}{required && <span className="text-red-500"> *</span>}</label>{children}{hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}{error && <p className="mt-1 text-xs text-red-600">{error}</p>}</div>
);
