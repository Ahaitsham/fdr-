import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileText, CheckCircle2, XCircle, Send, RotateCcw, Banknote, ArrowLeft } from 'lucide-react';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import { Spinner, ErrorBox, StatusBadge, Modal, Field, inr, dt, dtTime, FREQ_LABEL, tenureLabel } from '../components/ui';

export default function FdrDetail() {
  const { id } = useParams(); const { user } = useAuth(); const nav = useNavigate();
  const officer = user.role === 'AICTE_OFFICER';
  const [d, setD] = useState<any>(null); const [err, setErr] = useState('');
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null); const [remarks, setRemarks] = useState(''); const [rErr, setRErr] = useState(''); const [busy, setBusy] = useState(false);
  const load = () => api.get(`/fdrs/${id}`).then((r) => setD(r.data.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, [id]);
  if (err) return <ErrorBox msg={err} />;
  if (!d) return <Spinner />;
  const f = d.fdr;

  const openDoc = async () => {
    try { const r = await api.get(`/fdrs/${id}/document`, { responseType: 'blob' }); window.open(URL.createObjectURL(r.data), '_blank'); } catch (e) { setErr(errMsg(e)); }
  };
  const decide = async (kind: 'approve' | 'reject') => {
    setRErr('');
    if (kind === 'reject' && remarks.trim().length < 5) return setRErr('Please give a reason (at least 5 characters)');
    setBusy(true);
    try { await api.post(`/fdrs/${id}/${kind}`, { remarks }); setModal(null); setRemarks(''); window.dispatchEvent(new Event('notifications-changed')); await load(); }
    catch (e) { setRErr(errMsg(e)); } finally { setBusy(false); }
  };

  const timeline = [
    ...(f.events || []).map((e: any) => ({ at: e.at, title: e.type === 'SUBMITTED' ? 'Submitted for review' : 'Corrected & resubmitted', note: `Version ${e.version}`, tone: 'brand' })),
    ...d.reviews.map((r: any) => ({ at: r.reviewedAt, title: r.decision === 'APPROVED' ? 'Approved' : 'Rejected', note: `${r.officer?.name || 'Officer'} · v${r.version}${r.remarks ? ` — ${r.remarks}` : ''}`, tone: r.decision === 'APPROVED' ? 'green' : 'red' })),
  ].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  const dot: any = { brand: 'bg-brand-500', green: 'bg-emerald-500', red: 'bg-red-500' };
  const rows: [string, any][] = [['FDR reference no.', f.fdrNumber], ['Receipt no.', f.receiptNumber], ['Depositor', f.depositorName], ['Customer ID', f.customerId], ['Account no.', f.accountNumber], ['Bank', f.bankName], ['Branch', f.bankBranch],
    ['FDR amount', inr(f.principal)], ['Interest rate', `${f.interestRate}% p.a.`], ['Tenure', tenureLabel(f.tenureMonths)], ['Issue date', dt(f.issueDate)], ['Maturity date', dt(f.maturityDate)], ['Interest payout', FREQ_LABEL[f.payoutFrequency]]];

  return (
    <>
      <Link to={officer ? '/fdrs' : '/fdrs'} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Back to list</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 animate-fade-up">
        <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold">{f.fdrNumber}</h1><StatusBadge status={f.status} /></div>
          <p className="mt-1 text-sm text-slate-500">{f.institution?.name} ({f.institution?.code}) · version {f.version}</p></div>
        <div className="flex gap-2">
          {f.document && <button className="btn-ghost" onClick={openDoc}><FileText className="h-4 w-4" />View document</button>}
          {!officer && f.status === 'REJECTED' && <Link to={`/fdrs/${id}/edit`} className="btn-primary"><RotateCcw className="h-4 w-4" />Correct & resubmit</Link>}
          {officer && f.status === 'PENDING_REVIEW' && <><button className="btn-danger" onClick={() => setModal('reject')}><XCircle className="h-4 w-4" />Reject</button><button className="btn-success" onClick={() => setModal('approve')}><CheckCircle2 className="h-4 w-4" />Approve</button></>}
        </div>
      </div>
      {f.status === 'REJECTED' && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 animate-fade-up"><b>Rejected:</b> {f.rejectionReason}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[['Principal', inr(f.principal), 'text-slate-900'], ['Total return at maturity', inr(f.totalReturn), 'text-emerald-700'],
          ['Maturity', f.daysRemaining >= 0 ? `${f.daysRemaining} days left` : `Matured ${Math.abs(f.daysRemaining)} days ago`, f.maturityStatus === 'DUE_SOON' ? 'text-amber-600' : f.maturityStatus === 'EXPIRED' ? 'text-red-600' : 'text-slate-900']].map(([l, v, c], i) => (
          <div key={l} className="card p-4 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}><p className="text-sm text-slate-500">{l}</p><p className={`mt-1 text-xl font-semibold ${c}`}>{v}</p></div>))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5 animate-fade-up"><h2 className="mb-3 font-semibold">FDR details</h2>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{rows.map(([k, v]) => <div key={k}><dt className="text-xs text-slate-400">{k}</dt><dd className="text-sm font-medium">{v}</dd></div>)}
              <div><dt className="text-xs text-slate-400">Document</dt><dd className="text-sm font-medium">{f.document ? `${f.document.originalName}` : 'No document attached (demo record)'}</dd></div></dl></section>
          <section className="card p-5 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <h2 className="font-semibold">Returns schedule</h2>
            <p className="mb-3 text-sm text-slate-500">{f.status === 'APPROVED' ? 'Estimated from the stated rate, tenure and payout option.' : 'Becomes active once the FDR is approved.'} {f.payoutFrequency === 'CUMULATIVE' && 'Interest compounds quarterly and is paid at maturity.'}</p>
            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-slate-200"><th className="th px-2">Date</th><th className="th px-2">Type</th><th className="th px-2 text-right">Interest</th><th className="th px-2 text-right">Principal</th><th className="th px-2 text-right">You receive</th><th className="th px-2">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{f.schedule.map((s: any, i: number) => (
                <tr key={i}><td className="px-2 py-2.5">{dt(s.date)}</td><td className="px-2 py-2.5">{s.type === 'MATURITY' ? 'Maturity' : 'Interest'}</td><td className="px-2 py-2.5 text-right">{inr(s.interest)}</td><td className="px-2 py-2.5 text-right">{s.principal ? inr(s.principal) : '—'}</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-emerald-700"><span className="inline-flex items-center gap-1"><Banknote className="h-3.5 w-3.5" />{inr(s.amount)}</span></td>
                  <td className="px-2 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs ${s.received ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{s.received ? 'Paid' : 'Upcoming'}</span></td></tr>))}</tbody></table></div>
          </section>
        </div>
        <section className="card h-fit p-5 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <h2 className="mb-4 font-semibold">History</h2>
          <ol className="relative space-y-5 border-l border-slate-200 pl-5">{timeline.map((t, i) => (
            <li key={i} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}><span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dot[t.tone]}`} />
              <p className="text-sm font-medium">{t.title}</p><p className="text-xs text-slate-500">{t.note}</p><p className="text-xs text-slate-400">{dtTime(t.at)}</p></li>))}</ol>
        </section>
      </div>

      <Modal open={modal === 'approve'} onClose={() => setModal(null)} title="Approve this FDR?">
        <p className="text-sm text-slate-600">{f.fdrNumber} for {inr(f.principal)} will be marked approved and {f.institution?.name} will be notified. This decision is recorded in the history.</p>
        <Field label="Remarks (optional)"><textarea className="input mt-1" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        {rErr && <p className="mt-2 text-sm text-red-600">{rErr}</p>}
        <div className="mt-4 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn-success" disabled={busy} onClick={() => decide('approve')}><Send className="h-4 w-4" />{busy ? 'Saving…' : 'Confirm approval'}</button></div>
      </Modal>
      <Modal open={modal === 'reject'} onClose={() => setModal(null)} title="Reject this FDR">
        <Field label="Reason for rejection" required error={rErr}><textarea className="input" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Tell the institution exactly what to correct" /></Field>
        <div className="mt-4 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn-danger" disabled={busy} onClick={() => decide('reject')}>{busy ? 'Saving…' : 'Confirm rejection'}</button></div>
      </Modal>
    </>
  );
}
