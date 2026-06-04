import { getDb } from '../../db';
import type { Role } from '../../middleware/auth';

export interface UserRow {
  id: number;
  student_id: string;
  password_hash: string;
  name: string;
  role: Role;
  created_at: string;
}

export const authRepository = {
  findByStudentId(studentId: string): UserRow | undefined {
    return getDb()
      .prepare('SELECT * FROM users WHERE student_id = ?')
      .get(studentId) as UserRow | undefined;
  },

  findById(id: number): UserRow | undefined {
    return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  },
};
