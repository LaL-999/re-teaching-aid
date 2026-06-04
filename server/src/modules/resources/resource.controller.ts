import fs from 'node:fs';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/error';
import { resourceService } from './resource.service';

const idSchema = z.coerce.number().int().positive();

function cleanup(absolutePath: string): void {
  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch {
    /* ignore */
  }
}

function serveFile(
  req: Request,
  res: Response,
  next: NextFunction,
  disposition: 'inline' | 'attachment',
): void {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    throw new AppError(400, '资源参数有误');
  }
  const { row, absolutePath } = resourceService.getServableFile(id.data);
  const encodedName = `filename*=UTF-8''${encodeURIComponent(row.original_filename)}`;
  res.setHeader('Content-Disposition', `${disposition}; ${encodedName}`);
  res.type(row.ext || 'application/octet-stream');
  res.sendFile(absolutePath, (err) => {
    if (err) {
      next(err);
    }
  });
}

export const resourceController = {
  upload(req: Request, res: Response): void {
    // 非白名单类型已被 multer 前置拦截（"不支持该文件类型"）；此处 req.file 必为合法类型
    if (!req.file) {
      throw new AppError(400, '请上传文件');
    }
    const moduleId = idSchema.safeParse(req.body?.moduleId);
    if (!moduleId.success) {
      cleanup(req.file.path);
      throw new AppError(400, '请选择所属模块');
    }
    if (!req.auth) {
      cleanup(req.file.path);
      throw new AppError(401, '未登录');
    }
    const name = typeof req.body?.name === 'string' ? req.body.name : '';
    const description = typeof req.body?.description === 'string' ? req.body.description : '';

    const resource = resourceService.create({
      moduleId: moduleId.data,
      name,
      description,
      file: req.file,
      uploadedBy: req.auth.id,
    });
    res.status(201).json({ resource });
  },

  listByModule(req: Request, res: Response): void {
    const moduleId = idSchema.safeParse(req.params.moduleId);
    if (!moduleId.success) {
      throw new AppError(400, '模块参数有误');
    }
    res.json({ resources: resourceService.listByModule(moduleId.data) });
  },

  preview(req: Request, res: Response, next: NextFunction): void {
    serveFile(req, res, next, 'inline');
  },

  download(req: Request, res: Response, next: NextFunction): void {
    serveFile(req, res, next, 'attachment');
  },

  remove(req: Request, res: Response): void {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) {
      throw new AppError(400, '资源参数有误');
    }
    resourceService.remove(id.data);
    res.json({ ok: true });
  },
};
