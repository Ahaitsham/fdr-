import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from '../auth';
import { api, errMsg } from '../api';

export default function ChangePassword() {
  const { user, loading, refresh } = useAuth(); const nav = useNavigate();
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const submit = async (e: any) => {
    e.preventDefault(); setErr('');
    if (pw !== pw2) return setErr('New passwords do not match');
    setBusy(true);
    try { await api.post('/auth/change-password', { currentPassword: cur, newPassword: pw }); await refresh(); nav('/'); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8 animate-pop">
        <span className="inline-flex rounded-lg bg-brand-50 p-2 text-brand-600"><KeyRound className="h-5 w-5" /></span>
        <div><h2 className="text-xl font-semibold">Set a new password</h2><p className="text-sm text-slate-500">{user.mustChangePassword ? 'For security, replace your temporary password before continuing.' : 'Choose a new password.'}</p></div>
        {err && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <div><label className="label">Current / temporary password</label><input type="password" required className="input" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
        <div><label className="label">New password</label><input type="password" required minLength={8} className="input" value={pw} onChange={(e) => setPw(e.target.value)} /><p className="mt-1 text-xs text-slate-400">At least 8 characters with a letter and a number.</p></div>
        <div><label className="label">Confirm new password</label><input type="password" required className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </div>
  );
}
