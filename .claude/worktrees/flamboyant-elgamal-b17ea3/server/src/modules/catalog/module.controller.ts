import type { Request, Response } from 'express';
import { moduleService } from './module.service';

export const moduleController = {
  list(_req: Request, res: Response): void {
    res.json({ modules: moduleService.list() });
  },
};
