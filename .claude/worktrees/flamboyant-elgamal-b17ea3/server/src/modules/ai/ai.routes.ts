import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { aiController } from './ai.controller';

export const aiRouter = Router();

// 全部 AI 工具需登录；教师与学生共用（学生用于课后练习）
aiRouter.use(requireAuth);

aiRouter.get('/status', aiController.status);
// 流水线：① 产品概要 → ③ 具体需求 → ④ 分析审查 / 通用审核优化
aiRouter.post('/overview', aiController.overview);
aiRouter.post('/requirements', aiController.requirements);
aiRouter.post('/review', aiController.review);
aiRouter.post('/refine', aiController.refine);
// 既有工具
aiRouter.post('/interview', aiController.interview);
aiRouter.post('/istar', aiController.istar);
aiRouter.post('/uml/generate', aiController.generateUml);
aiRouter.post('/uml/render', aiController.renderUml);
aiRouter.post('/srs', aiController.srs);
