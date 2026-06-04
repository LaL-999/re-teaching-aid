import { http } from './http';
import type { AuthUser, LoginResult } from '../types';

export const authService = {
  async login(studentId: string, password: string): Promise<LoginResult> {
    const { data } = await http.post<LoginResult>('/api/auth/login', { studentId, password });
    return data;
  },

  async me(): Promise<AuthUser> {
    const { data } = await http.get<{ user: AuthUser }>('/api/auth/me');
    return data.user;
  },
};
