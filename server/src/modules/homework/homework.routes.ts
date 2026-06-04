import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { homeworkController } from './homework.controller';

export const homeworkRouter = Router();

homeworkRouter.use(requireAuth);

// 列表：教师看全部（含提交统计），学生看全部（含本人提交状态）
homeworkRouter.get('/assignments', homeworkController.list);

// 教师：布置 / 删除 / 查看某作业的全部提交
homeworkRouter.post('/assignments', requireRole('teacher'), homeworkController.create);
homeworkRouter.delete('/assignments/:id', requireRole('teacher'), homeworkController.remove);
homeworkRouter.get(
  '/assignments/:id/submissions',
  requireRole('teacher'),
  homeworkController.listSubmissions,
);

// 学生：提交（覆盖）/ 查看本人提交
homeworkRouter.post('/assignments/:id/submit', requireRole('student'), homeworkController.submit);
homeworkRouter.get(
  '/assignments/:id/my-submission',
  requireRole('student'),
  homeworkController.mySubmission,
);

// 教师：批改某份提交
homeworkRouter.post('/submissions/:id/grade', requireRole('teacher'), homeworkController.grade);
