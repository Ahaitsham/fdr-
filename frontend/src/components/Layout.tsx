import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, PlusCircle, Bell, Building2, BarChart3, ClipboardCheck, LogOut, Menu, X, Landmark } from 'lucide-react';
import { useAuth } from '../auth';
import { api } from '../api';

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const loc = useLocation(); const nav = useNavigate();
  const officer = user.role === 'AICTE_OFFICER';

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); document.addEventListener('keydown', h); return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; }; }, [open]);
  useEffect(() => {
    const load = () => api.get('/notifications', { params: { limit: 1 } }).then((r) => setUnread(r.data.unreadCount)).catch(() => {});
    load(); const t = setInterval(load, 30000); window.addEventListener('notifications-changed', load);
    return () => { clearInterval(t); window.removeEventListener('notifications-changed', load); };
  }, [loc.pathname]);

  const items = officer
    ? [['/', 'Dashboard', LayoutDashboard], ['/review', 'Review queue', ClipboardCheck], ['/fdrs', 'All FDRs', FileText], ['/institutions', 'Institutions', Building2], ['/analytics', 'Analytics', BarChart3], ['/notifications', 'Notifications', Bell]]
    : [['/', 'Dashboard', LayoutDashboard], ['/fdrs/new', 'Add FDR', PlusCircle], ['/fdrs', 'My FDRs', FileText], ['/analytics', 'Analytics', BarChart3], ['/notifications', 'Notifications', Bell]];

  const Nav = () => (
    <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
      {items.map(([to, label, Icon]: any) => (
        <NavLink key={to} to={to} end={to === '/' || to === '/fdrs'} className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
          <Icon className="h-5 w-5 transition group-hover:scale-110" />{label}
          {to === '/notifications' && unread > 0 && <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white animate-pop">{unread}</span>}
        </NavLink>
      ))}
    </nav>
  );
  const Brand = () => (
    <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
      <span className="rounded-lg bg-brand-900 p-2 text-white"><Landmark className="h-5 w-5" /></span>
      <div><p className="text-sm font-semibold leading-tight text-slate-900">AICTE FDR Portal</p><p className="text-xs text-slate-500">{officer ? 'Officer console' : 'Institution'}</p></div>
    </div>
  );
  const User = () => (
    <div className="border-t border-slate-200 p-4">
      <p className="truncate text-sm font-medium text-slate-800">{user.institution?.name || user.name}</p>
      <p className="truncate text-xs text-slate-500">{user.email}</p>
      <button onClick={async () => { await logout(); nav('/login'); }} className="mt-3 flex items-center gap-2 text-sm text-slate-500 transition hover:text-red-600"><LogOut className="h-4 w-4" />Sign out</button>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:fixed md:inset-y-0 md:flex"><Brand /><Nav /><User /></aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-brand-900" /><span className="text-sm font-semibold">AICTE FDR Portal</span></div>
        <button onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="relative rounded-lg p-2 hover:bg-slate-100"><Menu className="h-6 w-6" />{unread > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />}</button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 animate-fade" onClick={() => setOpen(false)} />
          <aside role="dialog" aria-modal="true" aria-label="Navigation menu" className="absolute right-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl animate-slide-left">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><span className="font-semibold">Menu</span><button autoFocus onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <Nav /><User />
          </aside>
        </div>
      )}
      <main className="min-w-0 flex-1 md:ml-64" aria-hidden={open}><div className="mx-auto max-w-6xl p-4 md:p-8"><Outlet /></div></main>
    </div>
  );
}
