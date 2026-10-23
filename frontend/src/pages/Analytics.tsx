import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import { PageHeader, Spinner, ErrorBox, Empty, inrShort } from '../components/ui';

const iso = (d: Date) => new Date(d.getTime() + 19800000).toISOString().slice(0, 10);
const PRESETS: [string, () => [string, string]][] = [
  ['Last 7 days', () => [iso(new Date(Date.now() - 6 * 864e5)), iso(new Date())]],
  ['Last 30 days', () => [iso(new Date(Date.now() - 29 * 864e5)), iso(new Date())]],
  ['Last 90 days', () => [iso(new Date(Date.now() - 89 * 864e5)), iso(new Date())]],
  ['This year', () => [`${iso(new Date()).slice(0, 4)}-01-01`, iso(new Date())]],
];
const PIE = { Approved: '#10b981', 'Pending review': '#f59e0b', Rejected: '#ef4444' } as any;

function Box({ title, sub, children, empty }: any) {
  return <section className="card p-5 animate-fade-up"><h2 className="font-semibold">{title}</h2>{sub && <p className="text-xs text-slate-400">{sub}</p>}<div className="mt-3 h-64">{empty ? <Empty title="No data in this range" /> : children}</div></section>;
}

export default function Analytics() {
  const { user } = useAuth(); const officer = user.role === 'AICTE_OFFICER';
  const [preset, setPreset] = useState('Last 30 days');
  const [range, setRange] = useState<[string, string]>(PRESETS[1][1]());
  const [inst, setInst] = useState(''); const [insts, setInsts] = useState<any[]>([]);
  const [d, setD] = useState<any>(null); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { if (officer) api.get('/institutions').then((r) => setInsts(r.data.data)).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    api.get('/analytics/charts', { params: { from: range[0], to: range[1], institution: inst || undefined } }).then((r) => { setD(r.data.data); setErr(''); }).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false));
  }, [range, inst]);
  const tick = (l: string) => (d?.range.bucket === 'month' ? l : l.slice(5));
  const sumOf = (k: string) => d ? d.timeline.reduce((s: number, x: any) => s + x[k], 0) : 0;

  return (
    <>
      <PageHeader title="Analytics" sub="Charts are built live from the database for the selected period" />
      <div className="card mb-6 flex flex-wrap items-center gap-2 p-4 animate-fade-up">
        {PRESETS.map(([l, fn]) => <button key={l} onClick={() => { setPreset(l); setRange(fn()); }} className={`rounded-full px-3 py-1.5 text-sm transition ${preset === l ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>)}
        <button onClick={() => setPreset('Custom')} className={`rounded-full px-3 py-1.5 text-sm transition ${preset === 'Custom' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Custom</button>
        {preset === 'Custom' && <div className="flex items-center gap-2"><input type="date" className="input w-auto" value={range[0]} max={range[1]} onChange={(e) => e.target.value && setRange([e.target.value, range[1]])} aria-label="From" /><span className="text-slate-400">to</span><input type="date" className="input w-auto" value={range[1]} min={range[0]} onChange={(e) => e.target.value && setRange([range[0], e.target.value])} aria-label="To" /></div>}
        {officer && <select className="input ml-auto w-auto" value={inst} onChange={(e) => setInst(e.target.value)} aria-label="Institution"><option value="">All institutions</option>{insts.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>}
      </div>
      {err && <ErrorBox msg={err} />}
      {loading && !d ? <Spinner /> : d && (
        <div className={`grid gap-6 lg:grid-cols-2 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <Box title="FDR submissions over time" sub={`${d.range.from} to ${d.range.to} · by ${d.range.bucket}`} empty={sumOf('submissions') === 0}>
            <ResponsiveContainer><AreaChart data={d.timeline}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tickFormatter={tick} fontSize={11} minTickGap={20} /><YAxis allowDecimals={false} fontSize={11} width={30} /><Tooltip /><Area type="monotone" dataKey="submissions" name="Submissions" stroke="#2563eb" fill="url(#g)" strokeWidth={2} /></AreaChart></ResponsiveContainer></Box>
          <Box title="Approvals vs rejections" sub="Review decisions in the period" empty={sumOf('approved') + sumOf('rejected') === 0}>
            <ResponsiveContainer><BarChart data={d.timeline}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tickFormatter={tick} fontSize={11} minTickGap={20} /><YAxis allowDecimals={false} fontSize={11} width={30} /><Tooltip /><Legend /><Bar dataKey="approved" name="Approved" fill="#10b981" radius={[3, 3, 0, 0]} /><Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></Box>
          <Box title="Status distribution" sub="FDRs created in the period" empty={d.statusData.every((s: any) => s.value === 0)}>
            <ResponsiveContainer><PieChart><Pie data={d.statusData.filter((s: any) => s.value > 0)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} label>{d.statusData.filter((s: any) => s.value > 0).map((s: any) => <Cell key={s.name} fill={PIE[s.name]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></Box>
          <Box title="Upcoming maturities" sub="Approved FDRs, next 12 months (not affected by the date range)" empty={d.maturities.every((m: any) => m.count === 0)}>
            <ResponsiveContainer><BarChart data={d.maturities}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" fontSize={11} tickFormatter={(l) => l.slice(2)} /><YAxis fontSize={11} width={50} tickFormatter={(v) => inrShort(v)} /><Tooltip formatter={(v: any, n: any) => (n === 'Total return' ? inrShort(v) : v)} /><Bar dataKey="amount" name="Total return" fill="#6366f1" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></Box>
          {officer && <div className="lg:col-span-2"><Box title="Institution-wise FDRs" sub="FDRs created in the period" empty={d.institutions.length === 0}>
            <ResponsiveContainer><BarChart data={d.institutions} layout="vertical" margin={{ left: 40 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="name" fontSize={11} width={150} /><Tooltip formatter={(v: any, n: any) => (n === 'Principal' ? inrShort(v) : v)} /><Legend /><Bar dataKey="count" name="FDR count" fill="#3b82f6" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></Box></div>}
        </div>)}
    </>
  );
}
