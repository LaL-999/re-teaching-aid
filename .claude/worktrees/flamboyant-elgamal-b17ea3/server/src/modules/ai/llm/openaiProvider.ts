import { config } from '../../../config';
import { LlmError, LlmTimeoutError } from './errors';
import type { LlmCompleteOptions, LlmMessage, LlmProvider } from './types';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * OpenAI 兼容 Chat Completions 客户端。
 * 通过 baseUrl 适配 DeepSeek / 智谱 / OpenAI / 本地 Ollama 等。
 * 使用内置 fetch + AbortController 实现超时控制（无额外依赖）。
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name = 'openai-compatible';
  readonly mode = 'live' as const;

  async complete(messages: LlmMessage[], options: LlmCompleteOptions = {}): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.llm.timeoutMs);

    try {
      const response = await fetch(`${config.llm.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.llm.apiKey}`,
        },
        body: JSON.stringify({
          model: config.llm.model,
          messages,
          temperature: options.temperature ?? 0.5,
          ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new LlmError(`大模型接口返回 ${response.status}：${detail.slice(0, 200)}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim() === '') {
        throw new LlmError('大模型返回内容为空');
      }
      return content;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LlmTimeoutError();
      }
      if (error instanceof LlmError) {
        throw error;
      }
      throw new LlmError(error instanceof Error ? error.message : '大模型调用失败');
    } finally {
      clearTimeout(timer);
    }
  }
}
