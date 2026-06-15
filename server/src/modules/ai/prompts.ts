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
          `你是资深需求工程评审专家。下面是「${stageLabel}」环节产出的内容。请对其进行审核并优化：` +
          '修正错误与不一致、补全缺失、使表述更清晰且尽量可度量；' +
          '务必保持与原内容相同的格式与语言——若原内容是代码（如 PlantUML / i* 模型），输出仍须是可直接使用的同类代码；若是 Markdown，输出仍是 Markdown。' +
          '只输出优化后的完整内容本身，不要输出任何解释或前后缀，不要使用 markdown 代码块标记包裹整篇。',
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
