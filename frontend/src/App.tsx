import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import FdrList from './pages/FdrList';
import FdrForm from './pages/FdrForm';
import FdrDetail from './pages/FdrDetail';
import Institutions from './pages/Institutions';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';

function Protected({ children }: any) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return children;
}
function Role({ allow, children }: { allow: string; children: any }) {
  const { user } = useAuth();
  return user.role === allow ? children : (
    <div className="py-20 text-center"><h1 className="text-2xl font-semibold">403 - Not allowed</h1><p className="mt-2 text-slate-500">Your role cannot access this page.</p><Link to="/" className="btn-primary mt-6">Go to dashboard</Link></div>
  );
}
const NotFound = () => (
  <div className="py-20 text-center"><h1 className="text-4xl font-semibold text-slate-900">404</h1><p className="mt-2 text-slate-500">That page does not exist.</p><Link to="/" className="btn-primary mt-6">Back to dashboard</Link></div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="fdrs" element={<FdrList />} />
        <Route path="fdrs/new" element={<Role allow="INSTITUTION"><FdrForm /></Role>} />
        <Route path="fdrs/:id" element={<FdrDetail />} />
        <Route path="fdrs/:id/edit" element={<Role allow="INSTITUTION"><FdrForm /></Role>} />
        <Route path="review" element={<Role allow="AICTE_OFFICER"><FdrList pending /></Role>} />
        <Route path="institutions" element={<Role allow="AICTE_OFFICER"><Institutions /></Role>} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
