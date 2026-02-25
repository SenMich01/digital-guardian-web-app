import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, subscriptionApi, type User, type Subscription } from './api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  subscription: Subscription | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginGoogle: (email: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    setToken(null);
    setUser(null);
    setSubscription(null);
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!token) return;
    try {
      const sub = await subscriptionApi.get();
      setSubscription(sub);
    } catch (err: unknown) {
      setSubscription(null);
      if (err instanceof Error && (err.message.includes('Authentication') || err.message.includes('Invalid'))) {
        logout();
      }
    }
  }, [token, logout]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setSubscription(null);
      setLoading(false);
      return;
    }
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
    refreshSubscription().finally(() => setLoading(false));
  }, [token, refreshSubscription]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    localStorage.setItem('userEmail', res.user.email);
    localStorage.setItem('userName', res.user.name || '');
    setToken(res.token);
    setUser(res.user);
    setSubscription(res.subscription);
  };

  const register = async (email: string, password: string, name?: string) => {
    const res = await authApi.register({ email, password, name });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    localStorage.setItem('userEmail', res.user.email);
    localStorage.setItem('userName', res.user.name || '');
    setToken(res.token);
    setUser(res.user);
    setSubscription(res.subscription);
  };

  const loginGoogle = async (email: string, name?: string) => {
    const res = await authApi.google({ email, name });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    localStorage.setItem('userEmail', res.user.email);
    localStorage.setItem('userName', res.user.name || '');
    setToken(res.token);
    setUser(res.user);
    setSubscription(res.subscription);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        subscription,
        loading,
        login,
        register,
        loginGoogle,
        logout,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
