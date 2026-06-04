import { config, isLlmConfigured } from '../../../config';
import { MockProvider } from './mockProvider';
import { OpenAiCompatibleProvider } from './openaiProvider';
import type { LlmProvider } from './types';

let provider: LlmProvider | null = null;

/**
 * 取大模型 provider 单例。
 * 已配置真实接口（LLM_API_KEY + LLM_BASE_URL）→ OpenAI 兼容客户端；
 * 否则 → 离线 Mock，保证无 key 也能演示。
 */
export function getLlmProvider(): LlmProvider {
  if (!provider) {
    provider = isLlmConfigured ? new OpenAiCompatibleProvider() : new MockProvider();
  }
  return provider;
}

export function isUsingMock(): boolean {
  return getLlmProvider().mode === 'mock';
}

export function llmStatus(): { mode: 'live' | 'mock'; model: string } {
  return {
    mode: getLlmProvider().mode,
    model: isLlmConfigured ? config.llm.model : 'offline-mock',
  };
}

export type { LlmProvider } from './types';
