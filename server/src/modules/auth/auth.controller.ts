import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/error';
import { authService } from './auth.service';

const loginSchema = z.object({
  studentId: z.string().trim().min(1, '请输入学号'),
  password: z.string().min(1, '请输入密码'),
});

export const authController = {
  login(req: Request, res: Response): void {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues[0]?.message ?? '参数有误');
    }
    const result = authService.login(parsed.data.studentId, parsed.data.password);
    res.json(result);
  },

  me(req: Request, res: Response): void {
    if (!req.auth) {
      throw new AppError(401, '未登录');
    }
    res.json({ user: authService.getProfile(req.auth.id) });
  },
};
