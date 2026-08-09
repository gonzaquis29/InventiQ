import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Rol } from '@/types';

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Rol[] }) {
  const { usuario } = useAuth();

  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
