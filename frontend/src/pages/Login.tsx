import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Landmark, ShieldCheck, TrendingUp, Bell } from 'lucide-react';
import { useAuth } from '../auth';
import { errMsg } from '../api';

export default function Login() {
  const { user, login } = useAuth(); const nav = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={user.mustChangePassword ? '/change-password' : '/'} replace />;
  const submit = async (e: any) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const u = await login(email, password); nav(u.mustChangePassword ? '/change-password' : '/'); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-gradient-to-br from-brand-50 to-white p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-md animate-fade-up">
          <span className="inline-flex rounded-xl bg-brand-900 p-3 text-white"><Landmark className="h-7 w-7" /></span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">Security deposits, tracked in one place.</h1>
          <p className="mt-3 text-slate-600">A centralized portal for AICTE officers and institutions to submit, verify and monitor Fixed Deposit Receipts.</p>
          <ul className="mt-8 space-y-4 text-sm text-slate-700">
            <li className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-brand-600" />Verified submissions with a clear approval trail</li>
            <li className="flex gap-3"><TrendingUp className="h-5 w-5 shrink-0 text-brand-600" />Institutions see exactly when their returns are due</li>
            <li className="flex gap-3"><Bell className="h-5 w-5 shrink-0 text-brand-600" />Automatic maturity reminders for everyone</li>
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8 animate-pop">
          <div><h2 className="text-xl font-semibold">Sign in</h2><p className="text-sm text-slate-500">Use the credentials issued by AICTE.</p></div>
          {err && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></div>
          <div><label className="label" htmlFor="pw">Password</label><input id="pw" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
