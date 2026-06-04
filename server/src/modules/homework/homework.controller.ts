import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/error';
import { homeworkService } from './homework.service';

const idSchema = z.coerce.number().int().positive();

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function parseOptionalModuleId(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(400, '所选模块有误');
  }
  return parsed.data;
}

function requireId(raw: unknown, message: string): number {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(400, message);
  }
  return parsed.data;
}

export const homeworkController = {
  list(req: Request, res: Response): void {
    if (!req.auth) {
      throw new AppError(401, '未登录');
    }
    const assignments =
      req.auth.role === 'teacher'
        ? homeworkService.listForTeacher()
        : homeworkService.listForStudent(req.auth.id);
    res.json({ assignments });
  },

  create(req: Request, res: Response): void {
    if (!req.auth) {
      throw new AppError(401, '未登录');
    }
    const dueDate = asString(req.body?.dueDate).trim() || null;
    const assignment = homeworkService.createAssignment(
      {
        title: asString(req.body?.title),
        description: asString(req.body?.description),
        moduleId: parseOptionalModuleId(req.body?.moduleId),
        dueDate,
      },
      req.auth.id,
    );
    res.status(201).json({ assignment });
  },

  remove(req: Request, res: Response): void {
    const id = requireId(req.params.id, '作业参数有误');
    homeworkService.removeAssignment(id);
    res.json({ ok: true });
  },

  listSubmissions(req: Request, res: Response): void {
    const id = requireId(req.params.id, '作业参数有误');
    res.json({ submissions: homeworkService.listSubmissions(id) });
  },

  submit(req: Request, res: Response): void {
    if (!req.auth) {
      throw new AppError(401, '未登录');
    }
    const id = requireId(req.params.id, '作业参数有误');
    const submission = homeworkService.submit(id, req.auth.id, asString(req.body?.content));
    res.json({ submission });
  },

  mySubmission(req: Request, res: Response): void {
    if (!req.auth) {
      throw new AppError(401, '未登录');
    }
    const id = requireId(req.params.id, '作业参数有误');
    res.json({ submission: homeworkService.getMySubmission(id, req.auth.id) });
  },

  grade(req: Request, res: Response): void {
    const id = requireId(req.params.id, '提交参数有误');
    const score = Number(req.body?.score);
    homeworkService.grade(id, score, asString(req.body?.feedback));
    res.json({ ok: true });
  },
};
