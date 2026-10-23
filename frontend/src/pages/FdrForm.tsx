import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, FileCheck2, Sparkles } from 'lucide-react';
import { api, errMsg, fieldErrors } from '../api';
import { PageHeader, Field, Spinner, ErrorBox, inr, FREQ_LABEL } from '../components/ui';
import { addMonths, preview } from '../lib/calc';

const text = (l: string, re?: RegExp, m?: string) => { let s = z.string({ required_error: `${l} is required` }).trim().min(1, `${l} is required`).max(120, `${l} is too long`); return re ? s.regex(re, m) : s; };
const num = (l: string, max: number) => z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number({ required_error: `${l} is required`, invalid_type_error: `${l} is invalid` }).positive(`${l} must be greater than 0`).max(max, `${l} is too large`));
const date = (l: string) => z.string({ required_error: `${l} is required` }).min(1, `${l} is required`);
const schema = z.object({
  fdrNumber: text('FDR reference number', /^[A-Za-z0-9\-\/]{3,40}$/, 'Use letters, numbers, - or / (3-40 chars)'),
  receiptNumber: text('Receipt number', /^[A-Za-z0-9\-\/]{3,40}$/, 'Use letters, numbers, - or / (3-40 chars)'),
  bankName: text('Bank name'), bankBranch: text('Bank branch'), depositorName: text('Depositor name'),
  customerId: text('Customer ID', /^[A-Za-z0-9\-]{3,30}$/, 'Letters, numbers and - only'),
  accountNumber: text('Account number', /^\d{6,20}$/, 'Account number must be 6-20 digits'),
  principal: num('FDR amount', 1e11), interestRate: num('Interest rate', 20),
  tenureMonths: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number({ required_error: 'Tenure is required', invalid_type_error: 'Tenure is invalid' }).int('Whole months only').min(1, 'Minimum 1 month').max(120, 'Maximum 120 months')),
  issueDate: date('Issue date'), maturityDate: date('Maturity date'), payoutFrequency: z.string(),
}).superRefine((d, ctx) => {
  if (d.issueDate && d.maturityDate && d.maturityDate <= d.issueDate) ctx.addIssue({ code: 'custom', path: ['maturityDate'], message: 'Maturity date must be after the issue date' });
});

export default function FdrForm() {
  const { id } = useParams(); const edit = !!id; const nav = useNavigate();
  const { register, handleSubmit, watch, setValue, setError, reset, formState: { errors } } = useForm<any>({ resolver: zodResolver(schema), defaultValues: { payoutFrequency: 'QUARTERLY' } });
  const [file, setFile] = useState<File | null>(null); const [fileErr, setFileErr] = useState('');
  const [busy, setBusy] = useState(false); const [banner, setBanner] = useState(''); const [loading, setLoading] = useState(edit); const [reason, setReason] = useState('');

  useEffect(() => { if (!edit) return;
    api.get(`/fdrs/${id}`).then((r) => { const f = r.data.data.fdr; if (f.status !== 'REJECTED') return nav(`/fdrs/${id}`);
      setReason(f.rejectionReason); reset({ ...f, issueDate: f.issueDate.slice(0, 10), maturityDate: f.maturityDate.slice(0, 10) }); }).catch((e) => setBanner(errMsg(e))).finally(() => setLoading(false));
  }, [id]);

  const w = watch(); const pv = preview(Number(w.principal), Number(w.interestRate), Number(w.tenureMonths), w.payoutFrequency);
  const autoMaturity = () => { if (w.issueDate && w.tenureMonths > 0) setValue('maturityDate', addMonths(w.issueDate, Number(w.tenureMonths)).toISOString().slice(0, 10), { shouldValidate: true }); };

  const onFile = (f?: File) => {
    setFileErr(''); if (!f) return setFile(null);
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(f.type)) return setFileErr('Only PDF, PNG or JPG files are allowed');
    if (f.size > 5 * 1024 * 1024) return setFileErr('File must be 5 MB or smaller');
    setFile(f);
  };
  const submit = async (v: any) => {
    setBanner('');
    if (!edit && !file) return setFileErr('FDR document is required');
    setBusy(true);
    try {
      const fd = new FormData(); Object.entries(v).forEach(([k, val]) => ['institution', 'document', 'id', 'status'].includes(k) ? null : fd.append(k, String(val ?? ''))); if (file) fd.append('document', file);
      const r = edit ? await api.put(`/fdrs/${id}`, fd) : await api.post('/fdrs', fd);
      nav(`/fdrs/${r.data.data.id}`);
    } catch (e) {
      setBanner(errMsg(e)); const fe = fieldErrors(e);
      Object.entries(fe).forEach(([k, m]) => k === 'document' ? setFileErr(String(m)) : setError(k, { message: String(m) }));
    } finally { setBusy(false); }
  };
  const inp = (k: string, extra: any = {}) => ({ ...register(k), className: `input ${errors[k] ? 'input-error' : ''}`, 'aria-invalid': !!errors[k], ...extra });
  const E = (k: string) => errors[k]?.message as string;
  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title={edit ? 'Correct & resubmit FDR' : 'Add Fixed Deposit Receipt'} sub="Enter the details exactly as printed on the bank's receipt. Fields marked * are mandatory." />
      {edit && reason && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 animate-fade-up"><b>Rejection reason:</b> {reason}</div>}
      {banner && <div role="alert" className="mb-4"><ErrorBox msg={banner} /></div>}
      <form onSubmit={handleSubmit(submit, () => setBanner('Please fill in all required FDR details before submitting.'))} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5 animate-fade-up"><h2 className="mb-4 font-semibold">Receipt details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="FDR reference no." required error={E('fdrNumber')}><input {...inp('fdrNumber')} placeholder="DEMO-PNB-001025" /></Field>
              <Field label="Receipt no." required error={E('receiptNumber')}><input {...inp('receiptNumber')} placeholder="672341" /></Field>
              <Field label="Bank name" required error={E('bankName')}><input {...inp('bankName')} placeholder="Punjab National Bank" /></Field>
              <Field label="Bank branch" required error={E('bankBranch')}><input {...inp('bankBranch')} placeholder="Rohini, Delhi" /></Field>
              <Field label="Depositor name" required error={E('depositorName')}><input {...inp('depositorName')} placeholder="Global Tech Institute" /></Field>
              <Field label="Customer ID" required error={E('customerId')}><input {...inp('customerId')} placeholder="C987654321" /></Field>
              <Field label="Account number" required error={E('accountNumber')}><input {...inp('accountNumber')} inputMode="numeric" placeholder="190012345678" /></Field>
            </div></section>
          <section className="card p-5 animate-fade-up" style={{ animationDelay: '80ms' }}><h2 className="mb-4 font-semibold">Deposit terms</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="FDR amount (₹)" required error={E('principal')}><input {...inp('principal')} inputMode="decimal" placeholder="500000" /></Field>
              <Field label="Interest rate (% p.a.)" required error={E('interestRate')}><input {...inp('interestRate')} inputMode="decimal" placeholder="6.25" /></Field>
              <Field label="Tenure (months)" required error={E('tenureMonths')} hint="12 = 1 year"><input {...inp('tenureMonths')} inputMode="numeric" placeholder="12" /></Field>
              <Field label="Interest payout" required error={E('payoutFrequency')}><select {...inp('payoutFrequency')}>{Object.entries(FREQ_LABEL).map(([k, l]) => <option key={k} value={k}>{l as string}</option>)}</select></Field>
              <Field label="Issue date" required error={E('issueDate')}><input type="date" {...inp('issueDate')} /></Field>
              <Field label="Maturity date" required error={E('maturityDate')}><div className="flex gap-2"><input type="date" {...inp('maturityDate')} /><button type="button" onClick={autoMaturity} className="btn-ghost shrink-0 px-3" title="Fill from issue date + tenure"><Sparkles className="h-4 w-4" /></button></div></Field>
            </div></section>
          <section className="card p-5 animate-fade-up" style={{ animationDelay: '160ms' }}><h2 className="mb-1 font-semibold">FDR document</h2>
            <p className="mb-3 text-sm text-slate-500">Upload a scan or photo of the receipt (PDF, PNG or JPG, max 5 MB). {edit && 'Leave empty to keep the existing document.'}</p>
            <label className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition hover:border-brand-500 hover:bg-brand-50/40 ${fileErr ? 'border-red-300' : 'border-slate-300'}`}>
              {file ? <FileCheck2 className="h-6 w-6 text-emerald-600" /> : <Upload className="h-6 w-6 text-slate-400" />}
              <span className="text-sm">{file ? <><b>{file.name}</b><span className="block text-xs text-slate-500">{file.type} · {(file.size / 1024).toFixed(0)} KB · ready to upload</span></> : 'Click to choose a file'}</span>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>{fileErr && <p className="mt-1 text-xs text-red-600">{fileErr}</p>}</section>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="card p-5 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <h2 className="font-semibold">Expected returns</h2><p className="mb-3 text-xs text-slate-400">Live preview from your inputs. Recalculated by the server on save.</p>
            {pv ? <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Total interest</dt><dd className="font-medium text-emerald-700">{inr(pv.totalInterest)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Total return</dt><dd className="font-semibold">{inr(pv.totalReturn)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Payouts</dt><dd>{pv.payments === 1 ? 'Once, at maturity' : `${pv.payments} payments of ~${inr(pv.each)}`}</dd></div></dl>
              : <p className="text-sm text-slate-400">Enter amount, rate and tenure to preview.</p>}
          </div>
          <button className="btn-primary w-full py-2.5" disabled={busy}>{busy ? 'Submitting…' : edit ? 'Resubmit for review' : 'Submit for review'}</button>
          <Link to={edit ? `/fdrs/${id}` : '/fdrs'} className="btn-ghost w-full">Cancel</Link>
        </aside>
      </form>
    </>
  );
}
