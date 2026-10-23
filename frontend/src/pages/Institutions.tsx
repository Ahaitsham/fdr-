import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Plus, Copy, Check, Power, KeyRound } from 'lucide-react';
import { api, errMsg, fieldErrors } from '../api';
import { PageHeader, Spinner, ErrorBox, Empty, Modal, Field, dtTime } from '../components/ui';

const F: [string, string, boolean, string?][] = [['name', 'Institution name', true], ['code', 'Institution code', true, 'e.g. GTI-001'], ['email', 'Official email', true], ['contactPerson', 'Contact person', false], ['phone', 'Phone', false],
  ['address', 'Address', true], ['city', 'City', true], ['state', 'State', true], ['postalCode', 'Postal code', true, '6 digits'], ['latitude', 'Latitude (optional)', false], ['longitude', 'Longitude (optional)', false]];

export default function Institutions() {
  const [rows, setRows] = useState<any[] | null>(null); const [err, setErr] = useState('');
  const [open, setOpen] = useState(false); const [cred, setCred] = useState<any>(null); const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<any>(null); const [busy, setBusy] = useState(false); const [banner, setBanner] = useState('');
  const { register, handleSubmit, setError, reset, formState: { errors } } = useForm<any>();
  const load = () => api.get('/institutions').then((r) => setRows(r.data.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);

  const create = async (v: any) => {
    setBusy(true); setBanner('');
    try { const r = await api.post('/institutions', v); setOpen(false); reset(); setCred({ name: r.data.data.institution.name, email: r.data.data.institution.email, password: r.data.data.temporaryPassword }); load(); }
    catch (e) { setBanner(errMsg(e)); Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k, { message: String(m) })); } finally { setBusy(false); }
  };
  const toggle = async () => { setBusy(true); try { await api.patch(`/institutions/${confirm.id}/status`, { active: !confirm.active }); setConfirm(null); load(); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); } };

  return (
    <>
      <PageHeader title="Institutions" sub="Register institutions and issue their login credentials" actions={<button className="btn-primary" onClick={() => { setOpen(true); setBanner(''); }}><Plus className="h-4 w-4" />Add institution</button>} />
      {err && <ErrorBox msg={err} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <div className="card"><Empty title="No institutions yet" /></div> : (
        <div className="grid gap-4 md:grid-cols-2">{rows.map((i, n) => (
          <div key={i.id} className="card card-hover p-5 animate-fade-up" style={{ animationDelay: `${n * 50}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3"><span className="h-fit rounded-lg bg-brand-50 p-2 text-brand-600"><Building2 className="h-5 w-5" /></span><div><p className="font-semibold">{i.name}</p><p className="text-xs text-slate-500">{i.code} · {i.city}, {i.state}</p><p className="text-xs text-slate-400">{i.email}</p></div></div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${i.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{i.active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">{[['Total', i.fdrCounts.total], ['Pending', i.fdrCounts.pending], ['Approved', i.fdrCounts.approved], ['Rejected', i.fdrCounts.rejected]].map(([l, v]) => <div key={l as string} className="rounded-lg bg-slate-50 py-2"><p className="text-base font-semibold text-slate-800">{v}</p><p className="text-slate-500">{l}</p></div>)}</div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400"><span>{i.passwordSetupPending ? <span className="inline-flex items-center gap-1 text-amber-600"><KeyRound className="h-3 w-3" />Awaiting first login</span> : i.lastLoginAt ? `Last login ${dtTime(i.lastLoginAt)}` : 'Never logged in'}</span>
              <button className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600" onClick={() => setConfirm(i)}><Power className="h-3.5 w-3.5" />{i.active ? 'Deactivate' : 'Activate'}</button></div>
          </div>))}</div>)}

      <Modal open={open} onClose={() => setOpen(false)} title="Register institution" wide>
        {banner && <div className="mb-3"><ErrorBox msg={banner} /></div>}
        <form onSubmit={handleSubmit(create)} noValidate className="grid gap-3 sm:grid-cols-2">
          {F.map(([k, l, req, ph]) => <div key={k} className={k === 'address' ? 'sm:col-span-2' : ''}><Field label={l} required={req} error={errors[k]?.message as string}><input className={`input ${errors[k] ? 'input-error' : ''}`} placeholder={ph} {...register(k, req ? { required: `${l} is required` } : {})} /></Field></div>)}
          <div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create & generate credentials'}</button></div>
        </form>
      </Modal>
      <Modal open={!!cred} onClose={() => setCred(null)} title="Institution created">
        {cred && <><p className="text-sm text-slate-600"><b>{cred.name}</b> can now sign in. Share this one-time password securely — it is <b>shown only once</b> and must be changed at first login.</p>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><p className="text-xs text-slate-400">Login email</p><p className="font-medium">{cred.email}</p><p className="mt-2 text-xs text-slate-400">Temporary password</p>
            <div className="flex items-center justify-between"><code className="font-mono text-base font-semibold">{cred.password}</code><button className="btn-ghost px-2 py-1" onClick={() => { navigator.clipboard.writeText(cred.password); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button></div></div>
          <div className="mt-4 flex justify-end"><button className="btn-primary" onClick={() => setCred(null)}>Done</button></div></>}
      </Modal>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.active ? 'Deactivate institution?' : 'Activate institution?'}>
        <p className="text-sm text-slate-600">{confirm?.active ? `${confirm?.name} will no longer be able to sign in. Their records are kept.` : `${confirm?.name} will be able to sign in again.`}</p>
        <div className="mt-4 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setConfirm(null)}>Cancel</button><button className={confirm?.active ? 'btn-danger' : 'btn-primary'} disabled={busy} onClick={toggle}>Confirm</button></div>
      </Modal>
    </>
  );
}
