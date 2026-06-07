import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './error';

export type Role = 'teacher' | 'student';

export interface AuthContext {
  id: number;
  role: Role;
  studentId: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * 解析 JWT。优先读 Authorization: Bearer，其次读 ?token=（仅文件预览/下载这类
 * 浏览器直连场景需要，因 <iframe>/<img> 无法携带自定义请求头）。
 */
function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  const queryToken = req.query.token;
  return typeof queryToken === 'string' && queryToken.length > 0 ? queryToken : undefined;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    throw new AppError(401, '未登录或登录已过期，请重新登录');
  }
  try {
    const payload = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
    req.auth = {
      id: Number(payload.sub),
      role: payload.role as Role,
      studentId: String(payload.studentId ?? ''),
      name: String(payload.name ?? ''),
    };
    next();
  } catch {
    throw new AppError(401, '登录已过期，请重新登录');
  }
}

/** 角色守卫：仅允许列出的角色访问。 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw new AppError(401, '未登录');
    }
    if (!roles.includes(req.auth.role)) {
      throw new AppError(403, '无权访问该功能');
    }
    next();
  };
}
