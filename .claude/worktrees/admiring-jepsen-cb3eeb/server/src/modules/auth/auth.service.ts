import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AppError } from '../../middleware/error';
import type { Role } from '../../middleware/auth';
import { authRepository } from './auth.repository';

export interface AuthUser {
  id: number;
  studentId: string;
  name: string;
  role: Role;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, role: user.role, studentId: user.studentId, name: user.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] },
  );
}

export const authService = {
  /**
   * 学号 + 密码登录。
   * - 账号不存在 → 「账号不存在」
   * - 账号存在但密码不符 → 「学号或密码错误」
   * 两类异常区分对待，对应验收场景。
   */
  login(studentId: string, password: string): LoginResult {
    const row = authRepository.findByStudentId(studentId);
    if (!row) {
      throw new AppError(401, '账号不存在');
    }

    const passwordMatches = bcrypt.compareSync(password, row.password_hash);
    if (!passwordMatches) {
      throw new AppError(401, '学号或密码错误');
    }

    const user: AuthUser = {
      id: row.id,
      studentId: row.student_id,
      name: row.name,
      role: row.role,
    };
    return { token: signToken(user), user };
  },

  /** 依据 JWT 中的用户 id 取回当前用户信息（用于会话恢复）。 */
  getProfile(userId: number): AuthUser {
    const row = authRepository.findById(userId);
    if (!row) {
      throw new AppError(401, '账号不存在');
    }
    return { id: row.id, studentId: row.student_id, name: row.name, role: row.role };
  },
};
