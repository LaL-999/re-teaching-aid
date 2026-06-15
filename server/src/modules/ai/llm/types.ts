export type AiToolTag =
  | 'overview'
  | 'requirements'
  | 'review'
  | 'refine'
  | 'interview'
  | 'istar'
  | 'uml'
  | 'srs'
  | 'trace';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompleteOptions {
  temperature?: number;
  maxTokens?: number;
  /** 工具标识：真实 provider 忽略它；离线 Mock 据此选择确定性输出。 */
  tag?: AiToolTag;
}

export interface LlmProvider {
  readonly name: string;
  readonly mode: 'live' | 'mock';
  complete(messages: LlmMessage[], options?: LlmCompleteOptions): Promise<string>;
}
