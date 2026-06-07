import type { NextFunction, Request, Response } from 'express';

/** 业务异常：携带 HTTP 状态码与面向用户的中文消息。 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** 包裹 async 路由处理器，使其 reject 自动转交 Express 错误中间件。 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { message: '接口不存在' } });
}

/** 统一错误出口：始终返回 { error: { message, code? } } 形状。 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { message: err.message, code: err.code } });
    return;
  }

  // multer 抛出的文件相关错误
  if (err instanceof Error && err.name === 'MulterError') {
    const code = (err as Error & { code?: string }).code;
    const message = code === 'LIMIT_FILE_SIZE' ? '文件过大，请控制在限制范围内' : '文件上传失败';
    res.status(400).json({ error: { message, code } });
    return;
  }

  // 未预期错误：记录到服务端日志，对外只暴露通用文案，避免泄露内部细节
  console.error('[unexpected-error]', err);
  res.status(500).json({ error: { message: '服务器内部错误，请稍后重试' } });
}
