import { AppError } from '../../middleware/error';
import { getLlmProvider, isUsingMock, llmStatus } from './llm';
import { LlmError, LlmTimeoutError } from './llm/errors';
import { markdownToHtml } from './markdown';
import { encodePlantumlUrl, renderPlantumlSvg } from './plantuml';
import { prompts } from './prompts';
import {
  isUmlDiagramType,
  type AiMode,
  type QualityIssue,
  type SrsInput,
  type TraceLink,
} from './types';

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

const REFINE_MARKER = '===优化后内容===';

/** 拆分「审核优化」输出：分隔符之前为改动说明(notes)，之后为优化后内容(refined)。 */
function splitRefineOutput(raw: string): { notes: string; refined: string } {
  const index = raw.indexOf(REFINE_MARKER);
  if (index === -1) {
    return { notes: '', refined: raw };
  }
  const notes = raw.slice(0, index).trim();
  const refined = raw.slice(index + REFINE_MARKER.length).trim();
  // 若分隔符后为空（模型未给内容），退回原始输出，避免清空产物
  return { notes, refined: refined || raw };
}

/** 生成 UUID v4 */
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 从 AI 生成的简化 JSON 转换为 piStar 完整 JSON 格式 */
function convertToIstarJson(simplified: unknown): string {
  // 解析失败（模型未返回有效 JSON）时退化为空结构而非抛错，避免不透明 500，与 review/trace 一致降级
  const data = (typeof simplified === 'object' && simplified !== null ? simplified : {}) as {
    actors?: Array<{
      name: string;
      nodes?: Array<{ name: string; type: string }>;
    }>;
    links?: Array<{
      source: string;
      target: string;
      type: string;
      label?: string;
    }>;
  };

  const nodeMap = new Map<string, { id: string; actorId: string }>();
  const actors: unknown[] = [];
  let yOffset = 50;

  // 处理 actors
  if (Array.isArray(data.actors)) {
    let xBase = 50;
    for (const actor of data.actors) {
      const actorId = generateUuid();
      const nodes: unknown[] = [];

      if (Array.isArray(actor.nodes)) {
        let nodeX = 50;
        for (const node of actor.nodes) {
          const nodeId = generateUuid();
          const nodeType = `istar.${node.type || 'Goal'}`;
          nodeMap.set(node.name, { id: nodeId, actorId });

          nodes.push({
            id: nodeId,
            text: node.name,
            type: nodeType,
            x: nodeX,
            y: yOffset + 100,
            customProperties: { Description: '' },
          });
          nodeX += 120;
        }
      }

      actors.push({
        id: actorId,
        text: actor.name,
        type: 'istar.Role',
        x: xBase,
        y: yOffset,
        customProperties: { Description: '' },
        nodes,
      });
      xBase += 200;
    }
  }

  // 处理 links
  const links: unknown[] = [];
  if (Array.isArray(data.links)) {
    for (const link of data.links) {
      const sourceInfo = nodeMap.get(link.source);
      const targetInfo = nodeMap.get(link.target);
      if (sourceInfo && targetInfo) {
        // 确保 link type 有 istar. 前缀
        let linkType = link.type || 'AndRefinementLink';
        if (!linkType.startsWith('istar.')) {
          linkType = `istar.${linkType}`;
        }
        const linkObj: Record<string, unknown> = {
          id: generateUuid(),
          type: linkType,
          source: sourceInfo.id,
          target: targetInfo.id,
        };
        // ContributionLink 需要 label
        if (linkType === 'istar.ContributionLink' && link.label) {
          linkObj.label = link.label;
        }
        links.push(linkObj);
      }
    }
  }

  const result = {
    actors,
    orphans: [],
    dependencies: [],
    links,
    display: {},
    tool: 'pistar.2.1.0',
    istar: '2.0',
    saveDate: new Date().toUTCString(),
    diagram: {
      width: 1000,
      height: 700,
      customProperties: { Description: '' },
    },
  };

  return JSON.stringify(result, null, 2);
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

function isValidTraceLink(value: unknown): value is TraceLink {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const link = value as Record<string, unknown>;
  return (
    typeof link.requirement === 'string' &&
    link.requirement.trim().length > 0 &&
    typeof link.status === 'string' &&
    link.status.trim().length > 0
  );
}

function asTraceLink(value: TraceLink): TraceLink {
  return {
    reqId: typeof value.reqId === 'string' ? value.reqId : '',
    requirement: value.requirement,
    srsRef: typeof value.srsRef === 'string' ? value.srsRef : '',
    component: typeof value.component === 'string' ? value.component : '',
    status: value.status,
  };
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
        maxTokens: 6000,
      });
      // 解析 AI 生成的简化 JSON，然后转换为 piStar 完整格式
      const simplified = extractJson<unknown>(raw);
      const piStarJson = convertToIstarJson(simplified);
      return { code: piStarJson, mode: currentMode() };
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
  ): Promise<{ refined: string; notes: string; mode: AiMode }> {
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
      const { notes, refined } = splitRefineOutput(raw);
      return { refined: stripCodeFence(refined), notes, mode: currentMode() };
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
    const material = input.material?.trim() ?? '';
    // 放宽校验：有上游需求素材即可生成（AI 自动从素材提炼项目名/功能点），
    // 让 SRS 也能纳入「一句话端到端」闭环，无需手动重填。
    const hasManualInput = Boolean(projectName) && features.length > 0;
    if (!hasManualInput && !material) {
      throw new AppError(400, '请提供上游需求素材，或填写项目名称和至少一个功能点');
    }
    const normalized: SrsInput = {
      projectName,
      features,
      background: input.background.trim(),
      material: material || undefined,
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

  // ⑧ 需求追踪矩阵：具体需求 + SRS → 需求↔系统 的双向追踪链
  async trace(
    requirements: string,
    srs: string,
  ): Promise<{ links: TraceLink[]; summary: string; mode: AiMode }> {
    const reqText = requirements.trim();
    const srsText = srs.trim();
    if (!reqText || !srsText) {
      throw new AppError(400, '请提供「具体需求」与「SRS 文档」两份内容');
    }
    try {
      const raw = await getLlmProvider().complete(prompts.trace(reqText, srsText), {
        tag: 'trace',
        temperature: 0.2,
        maxTokens: 6000,
      });
      const parsed = extractJson<{ links?: unknown; summary?: unknown }>(raw);
      const links = Array.isArray(parsed?.links)
        ? parsed!.links.filter(isValidTraceLink).map(asTraceLink)
        : [];
      const summary =
        typeof parsed?.summary === 'string' ? parsed.summary : `共建立 ${links.length} 条追踪链。`;
      return { links, summary, mode: currentMode() };
    } catch (error) {
      mapLlmError(error, '生成失败，请检查网络或稍后重试');
    }
  },
};
