import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { moduleController } from './module.controller';

export const moduleRouter = Router();

// 教师与学生均可查看模块列表
moduleRouter.get('/', requireAuth, moduleController.list);
