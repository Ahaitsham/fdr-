import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import { PageHeader, Spinner, ErrorBox, Empty, StatusBadge, MaturityBadge, inr, dt } from '../components/ui';

export default function FdrList({ pending = false }: { pending?: boolean }) {
  const { user } = useAuth(); const officer = user.role === 'AICTE_OFFICER';
  const [sp, setSp] = useSearchParams();
  const [rows, setRows] = useState<any[]>([]); const [pg, setPg] = useState<any>({ page: 1, pages: 1, total: 0 });
  const [insts, setInsts] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [err, setErr] = useState('');
  const [search, setSearch] = useState(sp.get('search') || '');

  const g = (k: string, d = '') => sp.get(k) || d;
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }); };

  useEffect(() => { if (officer) api.get('/institutions').then((r) => setInsts(r.data.data)).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(() => set('search', search), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    setLoading(true);
    const params: any = { page: g('page', '1'), search: g('search'), status: pending ? 'PENDING_REVIEW' : g('status'), maturity: g('maturity'), institution: g('institution'),
      sort: g('sort', pending ? 'submittedAt' : 'createdAt'), order: g('order', pending ? 'asc' : 'desc'), expiryFrom: g('from'), expiryTo: g('to') };
    api.get('/fdrs', { params }).then((r) => { setRows(r.data.data); setPg(r.data.pagination); setErr(''); }).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false));
  }, [sp.toString(), pending]);

  const sortVal = `${g('sort', pending ? 'submittedAt' : 'createdAt')}:${g('order', pending ? 'asc' : 'desc')}`;
  return (
    <>
      <PageHeader title={pending ? 'Review queue' : officer ? 'All FDRs' : 'My FDRs'} sub={pending ? 'Oldest submissions first' : `${pg.total} record${pg.total === 1 ? '' : 's'}`}
        actions={!officer && <Link to="/fdrs/new" className="btn-primary"><PlusCircle className="h-4 w-4" />Add FDR</Link>} />
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-up">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search FDR number" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search FDR number" /></div>
        {!pending && <select className="input" value={g('status')} onChange={(e) => set('status', e.target.value)} aria-label="Status"><option value="">All statuses</option><option value="PENDING_REVIEW">Pending review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select>}
        <select className="input" value={g('maturity')} onChange={(e) => set('maturity', e.target.value)} aria-label="Maturity"><option value="">Any maturity</option><option value="DUE_SOON">Maturing in 60 days</option><option value="EXPIRED">Matured / expired</option><option value="ACTIVE">Active (60+ days)</option></select>
        {officer && <select className="input" value={g('institution')} onChange={(e) => set('institution', e.target.value)} aria-label="Institution"><option value="">All institutions</option>{insts.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>}
        <select className="input" value={sortVal} onChange={(e) => { const [s, o] = e.target.value.split(':'); const n = new URLSearchParams(sp); n.set('sort', s); n.set('order', o); setSp(n, { replace: true }); }} aria-label="Sort">
          <option value="createdAt:desc">Newest first</option><option value="submittedAt:asc">Oldest submission first</option><option value="maturityDate:asc">Maturity: soonest</option><option value="maturityDate:desc">Maturity: latest</option><option value="principal:desc">Amount: high to low</option><option value="principal:asc">Amount: low to high</option>
        </select>
        <div className="flex items-center gap-2 sm:col-span-2"><input type="date" className="input" value={g('from')} onChange={(e) => set('from', e.target.value)} aria-label="Maturity from" /><span className="text-slate-400">to</span><input type="date" className="input" value={g('to')} onChange={(e) => set('to', e.target.value)} aria-label="Maturity to" /></div>
      </div>
      {err ? <ErrorBox msg={err} /> : loading ? <Spinner /> : rows.length === 0 ? <div className="card"><Empty title="No FDRs found" hint="Try changing the filters." /></div> : (
        <div className="card overflow-hidden animate-fade-up">
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr><th className="th">FDR no.</th>{officer && <th className="th">Institution</th>}<th className="th">Bank</th><th className="th text-right">Amount</th><th className="th">Maturity</th><th className="th">Status</th><th className="th">Submitted</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">{rows.map((f) => (
              <tr key={f.id} className="transition hover:bg-brand-50/40">
                <td className="td font-medium"><Link to={`/fdrs/${f.id}`} className="text-brand-700 hover:underline">{f.fdrNumber}</Link></td>
                {officer && <td className="td">{f.institution?.name}<span className="block text-xs text-slate-400">{f.institution?.code}</span></td>}
                <td className="td">{f.bankName}<span className="block text-xs text-slate-400">{f.bankBranch}</span></td>
                <td className="td text-right font-medium">{inr(f.principal)}</td>
                <td className="td">{dt(f.maturityDate)}<span className="block"><MaturityBadge f={f} /></span></td>
                <td className="td"><StatusBadge status={f.status} /></td>
                <td className="td text-slate-500">{dt(f.submittedAt)}</td>
                <td className="td"><Link to={`/fdrs/${f.id}`} className="btn-ghost px-3 py-1.5">{officer && f.status === 'PENDING_REVIEW' ? 'Review' : 'View'}</Link></td>
              </tr>))}</tbody>
          </table></div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            <span>Page {pg.page} of {pg.pages}</span>
            <div className="flex gap-2"><button className="btn-ghost px-3 py-1.5" disabled={pg.page <= 1} onClick={() => set('page', String(pg.page - 1))}><ChevronLeft className="h-4 w-4" />Prev</button><button className="btn-ghost px-3 py-1.5" disabled={pg.page >= pg.pages} onClick={() => set('page', String(pg.page + 1))}>Next<ChevronRight className="h-4 w-4" /></button></div>
          </div>
        </div>)}
    </>
  );
}
