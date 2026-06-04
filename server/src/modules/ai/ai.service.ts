import { AppError } from '../../middleware/error';
import { getLlmProvider, isUsingMock, llmStatus } from './llm';
import { LlmError, LlmTimeoutError } from './llm/errors';
import { markdownToHtml } from './markdown';
import { encodePlantumlUrl, renderPlantumlSvg } from './plantuml';
import { prompts } from './prompts';
import { isUmlDiagramType, type AiMode, type QualityIssue, type SrsInput } from './types';

function currentMode(): AiMode {
  return isUsingMock() ? 'mock' : 'live';
}

/** 将大模型异常映射为带验收文案的业务异常。其余异常原样抛出。 */
function mapLlmError(error: unknown, fallbackMessage: string): never {
  if (error instanceof LlmTimeoutError) {
    throw new AppError(503, fallbackMessage);
  }
  if (error instanceof LlmError) {
    throw new AppError(502, fallbackMessage);
  }
  throw error;
}

/** 去掉模型可能附带的 ```lang ... ``` 代码块包裹。 */
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/);
  return (fenced ? fenced[1]! : trimmed).trim();
}

/** 从模型输出中尽力提取 JSON（容忍代码块包裹与前后噪声）。 */
function extractJson<T>(raw: string): T | null {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* 尝试截取首个 JSON 片段 */
  }
  const match = cleaned.match(/[[{][\s\S]*[\]}]/);
  if (match) {
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function isValidQualityIssue(value: unknown): value is QualityIssue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const issue = value as Record<string, unknown>;
  return typeof issue.word === 'string' && typeof issue.suggestion === 'string';
}

export const aiService = {
  status(): { mode: AiMode; model: string } {
    // live 模式回显真实模型名（如 deepseek-chat），mock 模式回显 offline-mock
    return llmStatus();
  },

  // ① 产品概要：一句话想法 → 背景/目标/范围/干系人/概要功能
  async overview(idea: string): Promise<{ overview: string; mode: AiMode }> {
    const trimmed = idea.trim();
    if (!trimmed) {
      throw new AppError(400, '请输入产品想法或项目领域');
    }
    try {
      const raw = await getLlmProvider().complete(prompts.overview(trimmed), {
        tag: 'overview',
        temperature: 0.5,
        maxTokens: 4000,
      });
      return { overview: stripCodeFence(raw), mode: currentMode() };
    } catch (error) {
      mapLlmError(error, '生成失败，请检查网络或稍后重试');
    }
  },

  // ③ 具体需求：产品概要 → 功能模块 + 用户故事 + 验收标准
  async requirements(source: string): Promise<{ requirements: string; mode: AiMode }> {
    const trimmed = source.trim();
    if (!trimmed) {
      throw new AppError(400, '请输入产品概要或需求素材');
    }
    if (trimmed.length < 10) {
      throw new AppError(400, '内容过于简单，请提供更完整的产品概要或需求素材');
    }
    try {
      const raw = await getLlmProvider().complete(prompts.requirements(trimmed), {
        tag: 'requirements',
        temperature: 0.4,
        maxTokens: 6000,
      });
      return { requirements: stripCodeFence(raw), mode: currentMode() };
    } catch (error) {
      mapLlmError(error, '生成失败，请检查网络或稍后重试');
    }
  },

  async interview(domain: string): Promise<{ questions: string[]; mode: AiMode }> {
    if (!domain.trim()) {
      throw new AppError(400, '请输入项目领域');
    }
    try {
      const raw = await getLlmProvider().complete(prompts.interview(domain.trim()), {
        tag: 'interview',
        temperature: 0.6,
      });
      let questions = extractJson<string[]>(raw);
      if (!Array.isArray(questions)) {
        questions = raw
          .split('\n')
          .map((line) => line.replace(/^\s*\d+[.、)]\s*/, '').trim())
          .filter(Boolean);
      }
      const cleaned = questions
        .filter((q): q is string => typeof q === 'string')
        .map((q) => q.trim())
        .filter(Boolean);
      return { questions: cleaned, mode: currentMode() };
    } catch (error) {
      mapLlmError(error, 'AI服务暂时不可用，请稍后重试');
    }
  },

  async istar(requirement: string): Promise<{ code: string; mode: AiMode }> {
    const trimmed = requirement.trim();
    if (!trimmed) {
      throw new AppError(400, '请输入需求描述');
    }
    if (trimmed.length < 10) {
      throw new AppError(400, '需求描述过于简单，请补充更多细节');
    }
    try {
      const raw = await getLlmProvider().complete(prompts.istar(trimmed), {
        tag: 'istar',
        temperature: 0.4,
      });
      return { code: stripCodeFence(raw), mode: currentMode() };
    } catch (error) {
      mapLlmError(error, '生成失败，请检查网络或稍后重试');
    }
  },

  // ④ 需求分析与审查：检出模糊词/矛盾/缺失（含原「质量检查」能力）+ 产出优化后需求
  async review(
    text: string,
  ): Promise<{ issues: QualityIssue[]; summary: string; optimized: string; mode: AiMode }> {
    if (!text.trim()) {
      throw new AppError(400, '请输入需求文本');
    }
    try {
      const raw = await getLlmProvider().complete(prompts.review(text.trim()), {
        tag: 'review',
        temperature: 0.2,
        maxTokens: 6000,
      });
      const parsed = extractJson<{ issues?: unknown; summary?: unknown; optimized?: unknown }>(raw);
      const issues = Array.isArray(parsed?.issues)
        ? parsed!.issues.filter(isValidQualityIssue)
        : [];
      const summary =
        typeof parsed?.summary === 'string'
          ? parsed.summary
          : `共发现 ${issues.length} 处需要关注的表述。`;
      const optimized = typeof parsed?.optimized === 'string' ? parsed.optimized : '';
      return { issues, summary, optimized, mode: currentMode() };
    } catch (error) {
      mapLlmError(error, '生成失败，请检查网络或稍后重试');
    }
  },

  // 通用「审核并优化」：任一环节产物 → 改进后的同格式产物（流水线每阶段自带优化）
  async refine(
    stageLabel: string,
    content: string,
  ): Promise<{ refined: string; mode: AiMode }> {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new AppError(400, '没有可优化的内容，请先生成');
    }
    const label = stageLabel.trim() || '当前环节';
    try {
      const raw = await getLlmProvider().complete(prompts.refine(label, trimmed), {
        tag: 'refine',
        temperature: 0.3,
        maxTokens: 8000,
      });
      return { refined: stripCodeFence(raw), mode: currentMode() };
    } catch (error) {
      mapLlmError(error, '生成失败，请检查网络或稍后重试');
    }
  },

  async generateUml(
    description: string,
    diagramType: string,
  ): Promise<{ code: string; mode: AiMode }> {
    const trimmed = description.trim();
    if (!trimmed) {
      throw new AppError(400, '请输入系统描述');
    }
    if (!isUmlDiagramType(diagramType)) {
      throw new AppError(400, '请选择UML图形类型');
    }
    if (trimmed.length < 10) {
      throw new AppError(400, '需求描述过于简单，请提供更详细的系统功能说明');
    }
    try {
      const raw = await getLlmProvider().complete(prompts.uml(trimmed, diagramType), {
        tag: 'uml',
        temperature: 0.3,
      });
      return { code: stripCodeFence(raw), mode: currentMode() };
    } catch (error) {
      mapLlmError(error, '生成失败，请检查网络或稍后重试');
    }
  },

  /** 编译 PlantUML：成功返回 SVG 与外部链接；语法错误由 renderPlantumlSvg 抛 422。 */
  async renderUml(code: string): Promise<{ svg: string; externalUrl: string }> {
    const trimmed = code.trim();
    if (!trimmed) {
      throw new AppError(400, '请输入 PlantUML 代码');
    }
    const svg = await renderPlantumlSvg(trimmed);
    return { svg, externalUrl: encodePlantumlUrl(trimmed) };
  },

  async srs(
    input: SrsInput,
  ): Promise<{ markdown: string; html: string; mode: AiMode }> {
    const projectName = input.projectName.trim();
    const features = input.features.map((f) => f.trim()).filter(Boolean);
    if (!projectName || features.length === 0) {
      throw new AppError(400, '请填写项目名称和至少一个功能点');
    }
    const normalized: SrsInput = {
      projectName,
      features,
      background: input.background.trim(),
      material: input.material?.trim() || undefined,
      supplement: input.supplement,
    };
    try {
      const messages =
        normalized.supplement === 'nonfunctional'
          ? prompts.srsSupplementNfr(normalized)
          : prompts.srs(normalized);
      const raw = await getLlmProvider().complete(messages, {
        tag: 'srs',
        temperature: 0.4,
        // 给推理模型留足额度：推理 token 也计入输出预算，4000 易被推理吃光导致截断
        maxTokens: 8000,
      });
      const markdown = stripCodeFence(raw);
      return { markdown, html: markdownToHtml(markdown), mode: currentMode() };
    } catch (error) {
      mapLlmError(error, '生成失败，请检查网络或稍后重试');
    }
  },
};
