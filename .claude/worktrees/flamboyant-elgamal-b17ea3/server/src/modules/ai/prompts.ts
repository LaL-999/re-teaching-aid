import type { LlmMessage } from './llm/types';
import { UML_DIAGRAM_LABELS, type SrsInput, type UmlDiagramType } from './types';

/** 各 AI 工具的提示词构造器：system 放指令，user 放原始输入（便于 Mock 解析）。 */
export const prompts = {
  overview(idea: string): LlmMessage[] {
    return [
      {
        role: 'system',
        content:
          '你是资深产品经理与需求工程师。根据用户给出的产品想法或项目领域，输出一份简洁的「产品概要」（Markdown）。' +
          '必须包含以下小节：## 一、产品背景与待解决问题、## 二、产品目标、## 三、目标用户与干系人、## 四、范围（含明确不做的部分）、## 五、核心功能概要（要点列表）。' +
          '语言精炼、结构清晰，作为后续生成具体需求的依据。只输出 Markdown 正文，不要使用代码块包裹整篇。',
      },
      { role: 'user', content: idea },
    ];
  },

  requirements(source: string): LlmMessage[] {
    return [
      {
        role: 'system',
        content:
          '你是需求工程师。基于给定的产品概要或需求素材，产出一份「具体功能需求」清单（Markdown）。' +
          '要求：先将系统拆分为若干功能模块（## 模块名）；每条功能需求使用用户故事格式（作为…，我希望…，以便…），' +
          '并在其下给出 2-4 条可验收的验收标准（可用 Given/When/Then 或要点列表）。覆盖主要正常流程与关键异常场景。' +
          '只输出 Markdown 正文，不要使用代码块包裹整篇。',
      },
      { role: 'user', content: source },
    ];
  },

  review(text: string): LlmMessage[] {
    return [
      {
        role: 'system',
        content:
          '你是需求质量审查与优化专家。针对给定的需求文本：' +
          '(1) 检测模糊词、二义性、不可度量的主观表述，以及相互矛盾或明显缺失之处；' +
          '(2) 给出优化后的完整需求文本：将模糊表述替换为可度量指标、消解矛盾、补全明显缺失项，并尽量保留原结构。' +
          '只输出 JSON，结构为 ' +
          '{"issues":[{"word":"问题词或短语","type":"模糊词|主观词|矛盾|缺失","reason":"为什么是问题","suggestion":"如何改为可度量"}],' +
          '"summary":"总体结论","optimized":"优化后的完整需求文本（Markdown）"}。' +
          '不要输出多余文字，不要使用 markdown 代码块标记。',
      },
      { role: 'user', content: text },
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

  interview(domain: string): LlmMessage[] {
    return [
      {
        role: 'system',
        content:
          '你是资深需求工程访谈专家。根据用户给出的项目领域，生成一份高质量的用户访谈提纲。' +
          '要求：至少 8 个开放式问题，覆盖业务目标、干系人、痛点、现有流程、期望功能、约束条件、验收标准等维度。' +
          '只输出一个 JSON 字符串数组，每个元素是一个完整问题，不要输出多余文字，不要使用 markdown 代码块标记。',
      },
      { role: 'user', content: domain },
    ];
  },

  istar(requirement: string): LlmMessage[] {
    return [
      {
        role: 'system',
        content:
          '你是 i* 目标建模专家。根据需求描述生成 i*（iStar 2.0）模型代码。' +
          '请输出清晰、可读、带注释的 i* 文本表示，包含 actor、goal、softgoal、task、resource 以及 actor 间的 dependency。' +
          '只输出模型代码本身，不要输出额外说明，不要使用 markdown 代码块标记。',
      },
      { role: 'user', content: requirement },
    ];
  },

  uml(description: string, diagramType: UmlDiagramType): LlmMessage[] {
    const label = UML_DIAGRAM_LABELS[diagramType];
    return [
      {
        role: 'system',
        content:
          `你是 UML 与 PlantUML 专家。根据系统描述生成「${label}」的 PlantUML 代码。` +
          '要求：以 @startuml 开头、@enduml 结尾；语法正确、可直接编译；元素命名使用简洁中文。' +
          '只输出 PlantUML 代码本身，不要输出任何解释文字，不要使用 markdown 代码块标记。',
      },
      { role: 'user', content: `图形类型：${label}\n系统描述：${description}` },
    ];
  },

  srs(input: SrsInput): LlmMessage[] {
    return [
      {
        role: 'system',
        content:
          '你是软件需求工程专家。请按照 GB/T 9385《计算机软件需求规格说明规范》的结构，' +
          '生成一份结构完整的 SRS 文档（Markdown 格式），至少包含：引言、总体描述、功能需求、非功能需求、接口需求、验收准则等章节。' +
          '功能需求部分必须对每个功能点使用用户故事格式（作为…，我希望…，以便…）并给出验收标准。' +
          '只输出 Markdown 文档本身，不要使用 markdown 代码块标记包裹整篇文档。',
      },
      { role: 'user', content: buildSrsUserContent(input) },
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
    `项目名称：${input.projectName}`,
    `项目背景：${input.background || '（未提供，请合理假设）'}`,
    '主要功能点：',
    features,
  ];
  if (input.material && input.material.trim()) {
    lines.push('', '上游需求素材（请据此细化功能与非功能需求）：', input.material.trim());
  }
  return lines.join('\n');
}
