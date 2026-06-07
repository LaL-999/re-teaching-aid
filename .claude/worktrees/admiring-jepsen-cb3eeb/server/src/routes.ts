import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { moduleRouter } from './modules/catalog/module.routes';
import { resourceRouter } from './modules/resources/resource.routes';
import { aiRouter } from './modules/ai/ai.routes';
import { homeworkRouter } from './modules/homework/homework.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/modules', moduleRouter);
apiRouter.use('/resources', resourceRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/homework', homeworkRouter);
