import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../types';

/** 限定角色访问；角色不符回到应用首页（由首页按角色再分流）。 */
export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
