import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { uploadSingle } from './upload';
import { resourceController } from './resource.controller';

export const resourceRouter = Router();

// 上传课件（仅教师）。uploadSingle 先解析文件，类型非法即在此拦截。
resourceRouter.post('/', requireAuth, requireRole('teacher'), uploadSingle, resourceController.upload);

// 按模块列出资源（教师与学生均可）
resourceRouter.get('/module/:moduleId', requireAuth, resourceController.listByModule);

// 预览 / 下载（支持 ?token= 以适配 <iframe>/<img> 浏览器直连）
resourceRouter.get('/:id/preview', requireAuth, resourceController.preview);
resourceRouter.get('/:id/download', requireAuth, resourceController.download);

// 删除资源（仅教师）
resourceRouter.delete('/:id', requireAuth, requireRole('teacher'), resourceController.remove);
