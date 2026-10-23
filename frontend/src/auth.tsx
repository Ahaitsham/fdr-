import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';

export type User = { _id: string; name: string; email: string; role: 'INSTITUTION' | 'AICTE_OFFICER'; mustChangePassword: boolean; institution?: any };
const Ctx = createContext<any>(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try { setUser((await api.get('/auth/me')).data.data); } catch { setUser(null); } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
  const login = async (email: string, password: string) => { const r = await api.post('/auth/login', { email, password }); setUser(r.data.data); return r.data.data as User; };
  const logout = async () => { await api.post('/auth/logout'); setUser(null); };
  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}
