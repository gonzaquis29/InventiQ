import { createContext, useContext, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { Usuario } from '@/types';

interface AuthContextValue {
  usuario: Usuario | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const stored = localStorage.getItem('inventiq_user');
    return stored ? (JSON.parse(stored) as Usuario) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('inventiq_token', data.accessToken);
      localStorage.setItem('inventiq_user', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('inventiq_token');
    localStorage.removeItem('inventiq_user');
    setUsuario(null);
  }

  return <AuthContext.Provider value={{ usuario, login, logout, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
