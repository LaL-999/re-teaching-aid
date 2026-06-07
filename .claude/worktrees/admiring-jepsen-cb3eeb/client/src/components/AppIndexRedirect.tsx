import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/** /app 首页按角色分流：教师 → 资源管理，学生 → 课件浏览。 */
export function AppIndexRedirect() {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={user.role === 'teacher' ? '/app/resources' : '/app/browse'} replace />;
}
