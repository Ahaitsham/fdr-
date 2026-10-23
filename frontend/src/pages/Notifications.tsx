import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, FilePlus2, CheckCircle2, XCircle, AlarmClock, RotateCcw } from 'lucide-react';
import { api, errMsg } from '../api';
import { PageHeader, Spinner, ErrorBox, Empty, dtTime } from '../components/ui';

const ICON: any = { FDR_SUBMITTED: [FilePlus2, 'text-brand-600 bg-brand-50'], FDR_RESUBMITTED: [RotateCcw, 'text-brand-600 bg-brand-50'], FDR_APPROVED: [CheckCircle2, 'text-emerald-600 bg-emerald-50'], FDR_REJECTED: [XCircle, 'text-red-600 bg-red-50'], FDR_EXPIRING: [AlarmClock, 'text-amber-600 bg-amber-50'], FDR_EXPIRED: [AlarmClock, 'text-slate-600 bg-slate-100'] };

export default function Notifications() {
  const nav = useNavigate();
  const [d, setD] = useState<any>(null); const [page, setPage] = useState(1); const [err, setErr] = useState('');
  const load = () => api.get('/notifications', { params: { page, limit: 15 } }).then((r) => setD(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, [page]);
  const sync = () => window.dispatchEvent(new Event('notifications-changed'));
  const open = async (n: any) => { if (!n.read) { await api.patch(`/notifications/${n._id}/read`).catch(() => {}); sync(); } if (n.fdr) nav(`/fdrs/${n.fdr}`); else load(); };
  const readAll = async () => { await api.post('/notifications/read-all'); sync(); load(); };
  if (err) return <ErrorBox msg={err} />;
  if (!d) return <Spinner />;
  return (
    <>
      <PageHeader title="Notifications" sub={`${d.unreadCount} unread`} actions={d.unreadCount > 0 && <button className="btn-ghost" onClick={readAll}><CheckCheck className="h-4 w-4" />Mark all as read</button>} />
      {d.data.length === 0 ? <div className="card"><Empty title="You're all caught up" hint="New activity will appear here." /></div> : (
        <div className="card divide-y divide-slate-100 overflow-hidden animate-fade-up">{d.data.map((n: any) => { const [Icon, cls] = ICON[n.type] || [Bell, 'text-slate-600 bg-slate-100'];
          return (<button key={n._id} onClick={() => open(n)} className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 ${n.read ? '' : 'bg-brand-50/40'}`}>
            <span className={`mt-0.5 rounded-lg p-2 ${cls}`}><Icon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="text-sm font-medium">{n.title}</span>{!n.read && <span className="h-2 w-2 rounded-full bg-brand-600" />}</span><span className="block text-sm text-slate-600">{n.message}</span><span className="text-xs text-slate-400">{dtTime(n.createdAt)}</span></span>
          </button>); })}</div>)}
      {d.pagination.pages > 1 && <div className="mt-4 flex items-center justify-center gap-3 text-sm"><button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>Page {page} / {d.pagination.pages}<button className="btn-ghost" disabled={page >= d.pagination.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </>
  );
}
