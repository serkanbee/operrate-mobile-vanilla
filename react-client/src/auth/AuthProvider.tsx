import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { httpFetch } from '../api/httpClient';
import { login as apiLogin, logout as apiLogout } from '../api/auth';
import { log, warn } from '../utils/logger';

type User = any;
type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async (): Promise<User | null> => {
    try {
  const res = await httpFetch('/api/auth/me', { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const u = data.user || null;
        setUser(u);
        log('AuthProvider.refreshMe ok; user set');
        return u;
      } else {
        setUser(null);
        warn('AuthProvider.refreshMe not ok', res.status);
        return null;
      }
    } catch {
      setUser(null);
      warn('AuthProvider.refreshMe error');
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      await refreshMe();
      setLoading(false);
    })();
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    login: async (email: string, password: string) => {
      await apiLogin(email, password);
      const u = await refreshMe();
      if (!u) {
        // Ensure a user is present; if not, surface an error to the caller
        throw new Error('Login succeeded but user not loaded. Check API Base URL and /api/auth/me route.');
      }
      log('AuthProvider.login complete');
    },
    logout: async () => {
      await apiLogout();
      setUser(null);
  log('AuthProvider.logout complete');
    },
    refreshMe
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
