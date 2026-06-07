/** 大模型调用失败（HTTP 非 2xx、返回为空、网络异常等）。 */
export class LlmError extends Error {
  constructor(message = 'AI 服务调用失败') {
    super(message);
    this.name = 'LlmError';
  }
}

/** 大模型调用超时。 */
export class LlmTimeoutError extends LlmError {
  constructor(message = 'AI 服务响应超时') {
    super(message);
    this.name = 'LlmTimeoutError';
  }
}
