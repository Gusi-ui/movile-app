import type { Session, User } from '@supabase/supabase-js';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';

type Role = 'worker' | null;

interface AppUser {
  id: string;
  email: string;
  role: Role;
  name?: string; // Añadir campo opcional para el nombre
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined)
    throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const getWorkerRole = async (user: User): Promise<Role> => {
  // 1) metadata
  const metaRole = (user.user_metadata?.['role'] as string | undefined) ?? '';
  if (metaRole === 'worker') return 'worker';
  // 2) tabla auth_users
  const { data, error } = await supabase
    .from('auth_users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (error === null && (data?.role as string | undefined) === 'worker')
    return 'worker';
  return 'worker';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const buildUser = useCallback(
    async (u: User | null): Promise<AppUser | null> => {
      if (u === null) return null;
      const role = await getWorkerRole(u);
      return { id: u.id, email: u.email ?? '', role };
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    const init = async (): Promise<void> => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) setUser(await buildUser(data.session.user));
      setLoading(false);
    };
    init().catch(() => setLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) setUser(await buildUser(s.user));
      else setUser(null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [buildUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
