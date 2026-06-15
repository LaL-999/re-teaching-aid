import fs from 'node:fs';
import path from 'node:path';
import { config } from '../../config';

/**
 * 可在前端编辑的「输出格式提示词」中心。
 * - 默认 system 提示词集中于 DEFAULT_SYSTEM_PROMPTS（唯一真相源，prompts.ts 仅做薄构造）。
 * - 教师在前端「提示词工坊」编辑后，覆盖值落盘 server/data/prompt-templates.json。
 * - getSystemPrompt 在每次生成时取「覆盖 ?? 默认」，即改即用，可随时重置。
 */
export type PromptStageKey =
  | 'overview'
  | 'interview'
  | 'requirements'
  | 'review'
  | 'istar'
  | 'uml'
  | 'srs'
  | 'trace';

export interface PromptStageMeta {
  key: PromptStageKey;
  label: string;
  description: string;
  /** 输出形态，供前端提示编辑者注意契约 */
  output: 'markdown' | 'json' | 'code';
}

export const PROMPT_STAGES: PromptStageMeta[] = [
  { key: 'overview', label: '① 产品概要', description: '由一句话想法生成产品概要的章节结构', output: 'markdown' },
  { key: 'interview', label: '② 访谈提纲', description: '生成用户访谈问题清单', output: 'json' },
  { key: 'requirements', label: '③ 具体需求', description: '拆分功能模块、用户故事与验收标准', output: 'markdown' },
  { key: 'review', label: '④ 需求分析与审查', description: '检出问题并产出优化后需求', output: 'json' },
  { key: 'istar', label: '⑤ i* 目标建模', description: '生成 i* 目标模型（结构化 JSON）', output: 'json' },
  { key: 'uml', label: '⑥ UML 建模', description: '生成 PlantUML 代码', output: 'code' },
  { key: 'srs', label: '⑦ SRS 规格说明书', description: '按 GB/T 9385 生成 SRS 文档结构', output: 'markdown' },
  { key: 'trace', label: '⑧ 需求追踪矩阵', description: '建立需求↔系统的追踪链', output: 'json' },
];

export const DEFAULT_SYSTEM_PROMPTS: Record<PromptStageKey, string> = {
  overview:
    '你是资深产品经理与需求工程师。根据用户给出的产品想法或项目领域，输出一份简洁的「产品概要」（Markdown）。' +
    '必须包含以下小节：## 一、产品背景与待解决问题、## 二、产品目标、## 三、目标用户与干系人、## 四、范围（含明确不做的部分）、## 五、核心功能概要（要点列表）。' +
    '语言精炼、结构清晰，作为后续生成具体需求的依据。只输出 Markdown 正文，不要使用代码块包裹整篇。',

  interview:
    '你是资深需求工程访谈专家。根据用户给出的项目领域，生成一份高质量的用户访谈提纲。' +
    '要求：至少 8 个开放式问题，覆盖业务目标、干系人、痛点、现有流程、期望功能、约束条件、验收标准等维度。' +
    '只输出一个 JSON 字符串数组，每个元素是一个完整问题，不要输出多余文字，不要使用 markdown 代码块标记。',

  requirements:
    '你是需求工程师。基于给定的产品概要或需求素材，产出一份「具体功能需求」清单（Markdown）。' +
    '要求：先将系统拆分为若干功能模块（## 模块名）；每条功能需求使用用户故事格式（作为…，我希望…，以便…），' +
    '并在其下给出 2-4 条可验收的验收标准（可用 Given/When/Then 或要点列表）。覆盖主要正常流程与关键异常场景。' +
    '只输出 Markdown 正文，不要使用代码块包裹整篇。',

  review:
    '你是需求质量审查与优化专家。针对给定的需求文本：' +
    '(1) 检测模糊词、二义性、不可度量的主观表述，以及相互矛盾或明显缺失之处；' +
    '(2) 给出优化后的完整需求文本：将模糊表述替换为可度量指标、消解矛盾、补全明显缺失项，并尽量保留原结构。' +
    '只输出 JSON，结构为 ' +
    '{"issues":[{"word":"问题词或短语","type":"模糊词|主观词|矛盾|缺失","reason":"为什么是问题","suggestion":"如何改为可度量"}],' +
    '"summary":"总体结论","optimized":"优化后的完整需求文本（Markdown）"}。' +
    '不要输出多余文字，不要使用 markdown 代码块标记。',

  istar:
    '你是 i* 目标建模专家。根据需求描述生成 i*（iStar 2.0）模型代码。' +
    '请输出 JSON 格式，包含以下字段：' +
    '- actors: 角色数组，每个角色包含 name 和 nodes（子目标/任务/资源数组），每个 node 包含 name、type（Goal/Task/Resource/Quality）' +
    '- links: 链接数组，每个链接包含 source（源节点名称）、target（目标节点名称）、type、label（仅 ContributionLink 需要）' +
    '' +
    '⚠️ 模型必须丰富多样：' +
    '1. 至少包含 2 个 actor（如：用户、系统、管理员等）' +
    '2. 每个 actor 内要有不同类型的节点（Goal、Task、Resource、Quality 混合使用）' +
    '3. 必须有 links 连接节点，否则模型无法显示关系' +
    '4. 每个 actor 的节点数量控制在 4-6 个' +
    '' +
    '⚠️ 严格遵守 iStar 2.0 建模规则（所有 link 类型都要求 source 和 target 在同一个 actor 内）：' +
    '1. AndRefinementLink/OrRefinementLink：source 和 target 必须在同一个 actor 内，且 target 必须是 Goal 或 Task' +
    '2. NeededByLink：source 必须是 Resource，target 必须是 Task，且 source 和 target 必须在同一个 actor 内' +
    '3. ContributionLink：source 和 target 必须在同一个 actor 内，且 target 必须是 Quality' +
    '4. QualificationLink：source 必须是 Quality，target 必须是 Goal，且 source 和 target 必须在同一个 actor 内' +
    '⚠️ 绝对不允许跨 actor 创建 link！每个 link 的 source 和 target 节点必须属于同一个 actor 的 nodes 数组。' +
    '' +
    '支持的 link type：AndRefinementLink、OrRefinementLink、NeededByLink、ContributionLink、QualificationLink' +
    'ContributionLink 的 label 可选：help、make、break、hurt、unknown' +
    '' +
    '示例格式（注意：所有 link 的 source 和 target 都在同一个 actor 内）：' +
    '{"actors":[{"name":"用户","nodes":[{"name":"完成任务","type":"Goal"},{"name":"使用系统","type":"Task"},{"name":"账号信息","type":"Resource"},{"name":"操作便捷","type":"Quality"}]},{"name":"系统","nodes":[{"name":"处理请求","type":"Task"},{"name":"数据库","type":"Resource"},{"name":"响应快速","type":"Quality"},{"name":"高可靠性","type":"Quality"}]}],"links":[{"source":"使用系统","target":"完成任务","type":"AndRefinementLink"},{"source":"操作便捷","target":"使用系统","type":"QualificationLink"},{"source":"账号信息","target":"使用系统","type":"NeededByLink"},{"source":"处理请求","target":"响应快速","type":"ContributionLink","label":"help"},{"source":"数据库","target":"处理请求","type":"NeededByLink"},{"source":"高可靠性","target":"处理请求","type":"ContributionLink","label":"help"}]}' +
    '只输出 JSON，不要输出额外说明，不要使用 markdown 代码块标记。',

  uml:
    '你是 UML 与 PlantUML 专家。根据用户给出的图形类型与系统描述，生成对应的 PlantUML 代码。' +
    '要求：以 @startuml 开头、@enduml 结尾；语法正确、可直接编译；元素命名使用简洁中文。' +
    '只输出 PlantUML 代码本身，不要输出任何解释文字，不要使用 markdown 代码块标记。',

  srs:
    '你是软件需求工程专家。请按照 GB/T 9385《计算机软件需求规格说明规范》的结构，' +
    '生成一份结构完整的 SRS 文档（Markdown 格式），至少包含：引言、总体描述、功能需求、非功能需求、接口需求、验收准则等章节。' +
    '功能需求部分必须对每个功能点使用用户故事格式（作为…，我希望…，以便…）并给出验收标准。' +
    '若用户提供了项目名称/功能点则据此撰写；若仅提供「上游需求素材」，请从素材中自行提炼项目名称、功能点与背景。' +
    '只输出 Markdown 文档本身，不要使用 markdown 代码块标记包裹整篇文档。',

  trace:
    '你是需求追踪（Requirements Traceability）专家。给定「具体需求」与「软件需求规格说明书(SRS)」，建立需求到系统实现的追踪链。' +
    '只输出 JSON，结构为 {"links":[{"reqId":"需求编号或简称","requirement":"需求条目原文（精简）","srsRef":"对应的 SRS 章节或编号",' +
    '"component":"实现该需求的系统模块/组件","status":"已覆盖|部分覆盖|未覆盖"}],"summary":"覆盖情况总体结论"}。' +
    '逐条覆盖需求不要遗漏；SRS 中找不到对应处的标记为「未覆盖」。不要输出多余文字，不要使用 markdown 代码块标记。',
};

const OVERRIDES_FILE = path.join(config.paths.dataDir, 'prompt-templates.json');

function readOverrides(): Partial<Record<PromptStageKey, string>> {
  try {
    const parsed = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8')) as Record<string, unknown>;
    const result: Partial<Record<PromptStageKey, string>> = {};
    for (const stage of PROMPT_STAGES) {
      const value = parsed[stage.key];
      if (typeof value === 'string' && value.trim()) {
        result[stage.key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Partial<Record<PromptStageKey, string>>): void {
  fs.mkdirSync(config.paths.dataDir, { recursive: true });
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf8');
}

export function isPromptStage(value: string): value is PromptStageKey {
  return PROMPT_STAGES.some((stage) => stage.key === value);
}

/** 生成时取用：覆盖优先，否则默认。 */
export function getSystemPrompt(stage: PromptStageKey): string {
  return readOverrides()[stage] ?? DEFAULT_SYSTEM_PROMPTS[stage];
}

export interface PromptTemplateDto extends PromptStageMeta {
  system: string;
  default: string;
  isCustom: boolean;
}

export function listPromptTemplates(): PromptTemplateDto[] {
  const overrides = readOverrides();
  return PROMPT_STAGES.map((stage) => ({
    ...stage,
    system: overrides[stage.key] ?? DEFAULT_SYSTEM_PROMPTS[stage.key],
    default: DEFAULT_SYSTEM_PROMPTS[stage.key],
    isCustom: typeof overrides[stage.key] === 'string',
  }));
}

export function setPromptTemplate(stage: PromptStageKey, system: string): PromptTemplateDto {
  const overrides = readOverrides();
  overrides[stage] = system;
  writeOverrides(overrides);
  return listPromptTemplates().find((t) => t.key === stage)!;
}

export function resetPromptTemplate(stage: PromptStageKey): PromptTemplateDto {
  const overrides = readOverrides();
  delete overrides[stage];
  writeOverrides(overrides);
  return listPromptTemplates().find((t) => t.key === stage)!;
}
