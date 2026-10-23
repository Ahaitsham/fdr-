import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, XCircle, AlarmClock, Hourglass, Building2, PlusCircle, Wallet, TrendingUp, Banknote, CalendarClock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import { PageHeader, Spinner, ErrorBox, StatCard, StatusBadge, MaturityBadge, Empty, inr, inrShort, dt, dtTime } from '../components/ui';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { user } = useAuth(); const officer = user.role === 'AICTE_OFFICER';
  const [d, setD] = useState<any>(null); const [err, setErr] = useState('');
  useEffect(() => { api.get('/analytics/summary').then((r) => setD(r.data.data)).catch((e) => setErr(errMsg(e))); }, []);
  if (err) return <ErrorBox msg={err} />;
  if (!d) return <Spinner />;
  const c = d.counts, a = d.amounts;
  const totalFlow = a.returnsReceived + a.returnsPending;
  const pct = totalFlow ? Math.round((a.returnsReceived / totalFlow) * 100) : 0;
  const pieData = d.statusData.filter((x: any) => x.value > 0);

  return (
    <>
      <PageHeader title={officer ? 'Administrative dashboard' : `Welcome, ${user.institution?.name || user.name}`}
        sub={officer ? 'Live overview of security deposits across all institutions' : 'Track your fixed deposits and the returns you will receive'}
        actions={!officer && <Link to="/fdrs/new" className="btn-primary"><PlusCircle className="h-4 w-4" />Add FDR</Link>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total FDRs" value={c.total} to="/fdrs" icon={<FileText className="h-4 w-4" />} delay={0} />
        <StatCard label="Pending review" value={c.pending} to={officer ? '/review' : '/fdrs?status=PENDING_REVIEW'} tone="amber" icon={<Clock className="h-4 w-4" />} delay={50} />
        <StatCard label="Approved" value={c.approved} to="/fdrs?status=APPROVED" tone="green" icon={<CheckCircle2 className="h-4 w-4" />} delay={100} />
        <StatCard label="Rejected" value={c.rejected} to="/fdrs?status=REJECTED" tone="red" icon={<XCircle className="h-4 w-4" />} delay={150} />
        <StatCard label="Maturing in 60 days" value={c.dueSoon} to="/fdrs?maturity=DUE_SOON" tone="amber" icon={<AlarmClock className="h-4 w-4" />} delay={200} />
        <StatCard label="Matured / expired" value={c.expired} to="/fdrs?maturity=EXPIRED" tone="slate" icon={<Hourglass className="h-4 w-4" />} delay={250} />
        {officer && <StatCard label="Institutions" value={c.institutions} to="/institutions" icon={<Building2 className="h-4 w-4" />} delay={300} />}
        <StatCard label="Approved principal" value={a.principal} format={inrShort} icon={<Wallet className="h-4 w-4" />} tone="green" delay={350} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2 animate-fade-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-brand-600" /><h2 className="font-semibold">Returns tracker</h2></div>
          <p className="mt-1 text-sm text-slate-500">Estimated from approved FDRs using the stated rate, tenure and payout option.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Returns received so far</p><p className="text-lg font-semibold text-emerald-800">{inr(a.returnsReceived)}</p></div>
            <div className="rounded-lg bg-brand-50 p-3"><p className="text-xs text-brand-700">Still to receive</p><p className="text-lg font-semibold text-brand-900">{inr(a.returnsPending)}</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Total return at maturity</p><p className="text-lg font-semibold text-slate-800">{inr(a.totalReturn)}</p></div>
          </div>
          <div className="mt-4"><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000" style={{ width: `${pct}%` }} /></div><p className="mt-1 text-xs text-slate-500">{pct}% of expected returns already paid out</p></div>
          <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-slate-500" />Next payouts</h3>
          {d.upcomingReturns.length === 0 ? <p className="mt-2 text-sm text-slate-400">No upcoming payouts yet. They appear once an FDR is approved.</p> : (
            <ul className="mt-2 divide-y divide-slate-100">
              {d.upcomingReturns.map((u: any, i: number) => (
                <li key={i}><Link to={`/fdrs/${u.fdrId}`} className="flex items-center justify-between gap-3 py-2.5 text-sm transition hover:bg-slate-50">
                  <span><span className="font-medium">{u.fdrNumber}</span>{officer && <span className="text-slate-400"> · {u.institution}</span>}<span className="block text-xs text-slate-400">{dt(u.date)} · {u.type === 'MATURITY' ? 'Maturity payout' : 'Interest payout'}</span></span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-700"><Banknote className="h-4 w-4" />{inr(u.amount)}</span>
                </Link></li>
              ))}
            </ul>)}
        </section>

        <section className="card p-5 animate-fade-up" style={{ animationDelay: '250ms' }}>
          <h2 className="font-semibold">Status distribution</h2>
          {pieData.length === 0 ? <Empty title="No FDRs yet" /> : (
            <div className="h-56"><ResponsiveContainer><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
              {pieData.map((e: any) => <Cell key={e.name} fill={COLORS[d.statusData.findIndex((x: any) => x.name === e.name)]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>)}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <h2 className="font-semibold">{officer ? 'Awaiting your review' : 'Needs your attention'}</h2>
          {d.attention.length === 0 ? <Empty title={officer ? 'Review queue is clear' : 'Nothing needs correction'} /> : (
            <ul className="mt-2 divide-y divide-slate-100">{d.attention.map((f: any) => (
              <li key={f.id}><Link to={`/fdrs/${f.id}`} className="flex items-center justify-between py-2.5 text-sm hover:bg-slate-50"><span><span className="font-medium">{f.fdrNumber}</span><span className="block text-xs text-slate-400">{officer ? f.institution?.name : (f.rejectionReason || '').slice(0, 60)}</span></span><span className="text-right"><span className="block font-medium">{inr(f.principal)}</span><StatusBadge status={f.status} /></span></Link></li>))}</ul>)}
          {officer && d.institutionsAttention.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3"><h3 className="text-sm font-semibold">Institutions with pending FDRs</h3>{d.institutionsAttention.map((i: any) => <p key={i.name} className="mt-1 flex justify-between text-sm text-slate-600"><span>{i.name}</span><span className="font-medium text-amber-600">{i.pending}</span></p>)}</div>}
        </section>
        <section className="card p-5 animate-fade-up" style={{ animationDelay: '350ms' }}>
          <h2 className="font-semibold">Recently updated</h2>
          {d.recent.length === 0 ? <Empty title="No activity yet" action={!officer && <Link to="/fdrs/new" className="btn-primary">Add your first FDR</Link>} /> : (
            <ul className="mt-2 divide-y divide-slate-100">{d.recent.map((f: any) => (
              <li key={f.id}><Link to={`/fdrs/${f.id}`} className="flex items-center justify-between py-2.5 text-sm hover:bg-slate-50"><span><span className="font-medium">{f.fdrNumber}</span><span className="block text-xs text-slate-400">Matures {dt(f.maturityDate)}</span></span><span className="flex flex-col items-end gap-1"><StatusBadge status={f.status} /><MaturityBadge f={f} /></span></Link></li>))}</ul>)}
          <h3 className="mt-4 border-t border-slate-100 pt-3 text-sm font-semibold">Recent review decisions</h3>
          {d.recentReviews.length === 0 ? <p className="mt-1 text-sm text-slate-400">No decisions yet.</p> : d.recentReviews.map((r: any) => (
            <p key={r._id} className="mt-1.5 text-sm text-slate-600"><span className={r.decision === 'APPROVED' ? 'text-emerald-600' : 'text-red-600'}>{r.decision === 'APPROVED' ? 'Approved' : 'Rejected'}</span> {r.fdr?.fdrNumber} <span className="text-xs text-slate-400">· {dtTime(r.reviewedAt)}</span></p>))}
        </section>
      </div>
    </>
  );
}
