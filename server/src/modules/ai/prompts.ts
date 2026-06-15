import type { LlmMessage } from './llm/types';
import { UML_DIAGRAM_LABELS, type SrsInput, type UmlDiagramType } from './types';
import { getSystemPrompt, type PromptStageKey } from './promptTemplates';

/**
 * 各 AI 工具的提示词构造器：system 取自「可覆盖模板」（promptTemplates，教师可在前端编辑），
 * user 放原始输入（便于离线 Mock 解析）。
 * refine 与 srsSupplementNfr 为内部辅助模式，提示词内联、不对外暴露编辑。
 */
function sys(stage: PromptStageKey): LlmMessage {
  return { role: 'system', content: getSystemPrompt(stage) };
}

export const prompts = {
  overview(idea: string): LlmMessage[] {
    return [sys('overview'), { role: 'user', content: idea }];
  },

  requirements(source: string): LlmMessage[] {
    return [sys('requirements'), { role: 'user', content: source }];
  },

  review(text: string): LlmMessage[] {
    return [sys('review'), { role: 'user', content: text }];
  },

  interview(domain: string): LlmMessage[] {
    return [sys('interview'), { role: 'user', content: domain }];
  },

  istar(requirement: string): LlmMessage[] {
    return [sys('istar'), { role: 'user', content: requirement }];
  },

  uml(description: string, diagramType: UmlDiagramType): LlmMessage[] {
    const label = UML_DIAGRAM_LABELS[diagramType];
    return [sys('uml'), { role: 'user', content: `图形类型：${label}\n系统描述：${description}` }];
  },

  srs(input: SrsInput): LlmMessage[] {
    return [sys('srs'), { role: 'user', content: buildSrsUserContent(input) }];
  },

  trace(requirements: string, srs: string): LlmMessage[] {
    return [
      sys('trace'),
      { role: 'user', content: `【具体需求】\n${requirements}\n\n【SRS 文档】\n${srs}` },
    ];
  },

  refine(stageLabel: string, content: string): LlmMessage[] {
    return [
      {
        role: 'system',
        content:
          `你是资深需求工程评审专家。请审核并"实质性"优化「${stageLabel}」环节的产出：` +
          '把模糊/主观表述改为可度量指标、补全缺失的验收标准或边界条件、消解前后矛盾、提升清晰度与一致性；' +
          '务必保持与原内容相同的语言与格式（若是代码如 PlantUML / i* 模型，输出仍须是可直接使用的同类代码；若是 Markdown，输出仍是 Markdown）。' +
          '\n输出格式严格遵守以下三段：' +
          '\n①先用 3-6 条要点列出本次"具体改了什么、为什么改"（尽量点名原文中的问题，如某处模糊词、缺失的验收标准）；' +
          '\n②另起一行输出分隔符（独占一行）：===优化后内容===' +
          '\n③再输出完整的优化后内容本身，不要再加任何解释或前后缀，不要使用 markdown 代码块标记包裹整篇。' +
          '\n若内容确实已很完善、无需改动，第①段如实说明，第③段原样输出原内容。',
      },
      { role: 'user', content },
    ];
  },

  srsSupplementNfr(input: SrsInput): LlmMessage[] {
    return [
      {
        role: 'system',
        content:
          '你是软件需求工程专家。请仅生成「非功能需求」章节（Markdown），覆盖性能、可用性、安全性、兼容性、可维护性等方面，' +
          '尽量给出可度量指标。只输出该章节 Markdown，不要使用代码块标记。',
      },
      { role: 'user', content: buildSrsUserContent(input) },
    ];
  },
};

function buildSrsUserContent(input: SrsInput): string {
  const features = input.features.map((f) => `- ${f}`).join('\n');
  const lines = [
    `项目名称：${input.projectName || '（未提供，请从素材中提炼）'}`,
    `项目背景：${input.background || '（未提供，请合理假设）'}`,
    '主要功能点：',
    features || '（未提供，请从素材中提炼）',
  ];
  if (input.material && input.material.trim()) {
    lines.push('', '上游需求素材（请据此细化功能与非功能需求）：', input.material.trim());
  }
  return lines.join('\n');
}
