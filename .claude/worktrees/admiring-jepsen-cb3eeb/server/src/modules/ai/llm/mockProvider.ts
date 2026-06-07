import type { LlmCompleteOptions, LlmMessage, LlmProvider } from './types';

/**
 * 离线确定性 Mock。无需 API Key / 网络即可让全部 AI 工具跑通验收场景。
 * 通过 options.tag 区分工具；从最后一条 user 消息读取原始输入。
 */
export class MockProvider implements LlmProvider {
  readonly name = 'offline-mock';
  readonly mode = 'mock' as const;

  async complete(messages: LlmMessage[], options: LlmCompleteOptions = {}): Promise<string> {
    const input = lastUserMessage(messages).trim();
    switch (options.tag) {
      case 'overview':
        return mockOverview(input);
      case 'requirements':
        return mockRequirements(input);
      case 'review':
        return mockReview(input);
      case 'refine':
        return mockRefine(input);
      case 'interview':
        return mockInterview(input);
      case 'istar':
        return mockIstar(input);
      case 'uml':
        return mockUml(input);
      case 'srs':
        return mockSrs(input);
      default:
        return '（离线 Mock）暂不支持的工具类型。';
    }
  }
}

// ---------- 通用小工具 ----------

function lastUserMessage(messages: LlmMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') {
      return messages[i]!.content;
    }
  }
  return messages[messages.length - 1]?.content ?? '';
}

function splitItems(text: string): string[] {
  return text
    .split(/[、，,/]|和(?=[一-龥])/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

// ---------- 产品概要 ----------

function mockOverview(idea: string): string {
  const name = idea || '目标产品';
  return [
    `# 《${name}》产品概要`,
    '',
    '## 一、产品背景与待解决问题',
    `围绕「${name}」存在效率偏低、流程分散、体验不一致等问题，亟需一套数字化方案统一支撑。`,
    '',
    '## 二、产品目标',
    '- 提升核心业务办理效率',
    '- 统一数据与流程，减少人工差错',
    '- 改善各类用户的使用体验',
    '',
    '## 三、目标用户与干系人',
    '- 终端用户：直接使用核心功能',
    '- 业务管理员：负责配置与运营维护',
    '- 决策者：关注整体效益与合规',
    '',
    '## 四、范围（含明确不做的部分）',
    `- 纳入：「${name}」核心业务闭环、基础数据管理、权限与审计`,
    '- 暂不纳入：复杂报表分析、第三方深度集成（后续迭代）',
    '',
    '## 五、核心功能概要',
    '- 用户与权限管理',
    '- 核心业务办理',
    '- 数据查询与管理',
    '- 通知与反馈',
    '',
    '_本概要由离线模式基于模板生成，请结合实际补充。_',
  ].join('\n');
}

// ---------- 具体需求 ----------

function mockRequirements(source: string): string {
  const featureBlock = source.match(/核心功能概要[^\n]*\n([\s\S]+)/)?.[1] ?? '';
  let feats = featureBlock
    .split('\n')
    .map((line) => line.replace(/^[-*\d.、\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 6);
  if (feats.length === 0) {
    feats = splitItems(source).slice(0, 5);
  }
  if (feats.length === 0) {
    feats = ['核心业务办理', '数据查询', '用户与权限'];
  }

  const lines: string[] = ['# 具体功能需求', ''];
  feats.forEach((feature, index) => {
    lines.push(`## 模块 ${index + 1}：${feature}`);
    lines.push('');
    lines.push(`- **用户故事**：作为系统用户，我希望「${feature}」，以便高效达成业务目标。`);
    lines.push('- **验收标准**：');
    lines.push(`  - Given 用户已登录并具备权限，When 发起「${feature}」，Then 系统校验输入、成功处理并给出反馈；`);
    lines.push('  - 输入非法或权限不足时，给出明确错误提示且不产生脏数据。');
    lines.push('');
  });
  lines.push('_本清单由离线模式基于模板生成，请结合实际补充。_');
  return lines.join('\n');
}

// ---------- 审核优化（refine） ----------

function mockRefine(content: string): string {
  // 离线模式无法真正改写，原样返回；接入真实大模型可获得实质优化。
  return content;
}

// ---------- 访谈提纲 ----------

function mockInterview(domain: string): string {
  const d = domain || '该项目';
  const questions = [
    `请简要介绍「${d}」要解决的核心业务问题，目前是如何处理的？`,
    `「${d}」的主要用户与干系人有哪些？他们各自最关心什么？`,
    `在现有流程中，哪些环节最耗时、最容易出错或最让人不满？`,
    `您期望「${d}」上线后，最先改善的三件事是什么？`,
    `有哪些必须遵守的业务规则、行业规范或合规要求？`,
    `系统需要与哪些外部系统、设备或数据源对接？`,
    `在性能、并发、可用性、安全等方面，是否有明确的底线指标？`,
    `预算、上线时间、团队规模等方面存在哪些约束？`,
    `如果只能先上线一个核心功能，您会选择哪一个？为什么？`,
    `您将如何判断「${d}」最终是成功的？验收标准是什么？`,
  ];
  return JSON.stringify(questions);
}

// ---------- i* 模型 ----------

function mockIstar(requirement: string): string {
  const actors: Array<{ name: string; goal: string }> = [];
  const re = /([^，。；,;\s]{1,12})(?:希望|想要|需要|期望)([^，。；,;]{1,30})/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(requirement)) !== null && actors.length < 6) {
    actors.push({ name: match[1]!.trim(), goal: match[2]!.trim() });
  }
  if (actors.length === 0) {
    actors.push(
      { name: '用户', goal: '高效完成核心任务' },
      { name: '系统管理员', goal: '保障系统稳定运行' },
    );
  }

  const lines: string[] = [
    '%% i* 模型（iStar 2.0 文本表示）— 由需求描述生成',
    `%% 原始需求：${requirement.slice(0, 60)}${requirement.length > 60 ? '…' : ''}`,
    '',
  ];
  for (const a of actors) {
    lines.push(`actor ${a.name} {`);
    lines.push(`  goal      "${a.goal}"`);
    lines.push(`  softgoal  "${a.name}满意度提升"`);
    lines.push(`  task      "执行与「${a.goal}」相关的操作"`);
    lines.push('}');
    lines.push('');
  }
  lines.push('%% 依赖关系：depender -( dependum )-> dependee');
  for (let i = 0; i < actors.length - 1; i += 1) {
    lines.push(`${actors[i]!.name} -( ${actors[i + 1]!.goal} )-> ${actors[i + 1]!.name}`);
  }
  return lines.join('\n');
}

// ---------- 需求质量检查（词典规则） ----------

const VAGUE_TERMS: Array<{ word: string; type: string; suggestion: string }> = [
  { word: '快', type: '模糊词', suggestion: '量化为响应时间，如「95% 请求 ≤ 2 秒返回」' },
  { word: '方便', type: '主观词', suggestion: '量化为操作步骤或耗时，如「≤ 3 步完成下单」' },
  { word: '友好', type: '主观词', suggestion: '改为可度量可用性，如「新用户 5 分钟内独立完成核心任务」' },
  { word: '高效', type: '模糊词', suggestion: '给出吞吐/耗时指标，如「单批处理 ≤ 1 秒」' },
  { word: '尽快', type: '模糊词', suggestion: '给出明确时限，如「3 个工作日内」' },
  { word: '实时', type: '模糊词', suggestion: '明确延迟上限，如「端到端延迟 ≤ 500ms」' },
  { word: '稳定', type: '模糊词', suggestion: '量化为可用性 SLA，如「月可用性 ≥ 99.9%」' },
  { word: '美观', type: '主观词', suggestion: '引用设计规范/走查清单替代主观判断' },
  { word: '简单', type: '主观词', suggestion: '用可度量目标替代，如「学习成本 ≤ 10 分钟」' },
  { word: '灵活', type: '模糊词', suggestion: '列出需要支持的具体可配置项' },
  { word: '大量', type: '模糊词', suggestion: '给出数量级，如「支持 10 万级并发用户」' },
  { word: '一些', type: '模糊词', suggestion: '明确具体数量或范围' },
  { word: '可能', type: '模糊词', suggestion: '去除不确定措辞，明确「应当 / 必须」' },
  { word: '大概', type: '模糊词', suggestion: '给出确定数值或区间' },
];

function mockReview(text: string): string {
  const issues = VAGUE_TERMS.filter((term) => text.includes(term.word)).map((term) => ({
    word: term.word,
    type: term.type,
    reason: `「${term.word}」缺乏可度量标准，易产生二义性，难以验收。`,
    suggestion: term.suggestion,
  }));

  const summary =
    issues.length > 0
      ? `共发现 ${issues.length} 处模糊 / 主观表述，建议替换为可度量指标。（离线模式基于词典检测；矛盾检测请配置真实大模型）`
      : '未检测到常见模糊词，建议进一步人工复核可度量性与一致性。（离线模式）';

  // 优化后需求：离线模式无法整体改写，给出原文 + 可度量化改写建议清单
  const optimized =
    issues.length > 0
      ? [
          text.trim(),
          '',
          '---',
          '**可度量化改写建议（离线）：**',
          ...issues.map((i) => `- 将「${i.word}」改为：${i.suggestion}`),
        ].join('\n')
      : text.trim();

  return JSON.stringify({ issues, summary, optimized });
}

// ---------- UML / PlantUML ----------

function mockUml(input: string): string {
  const type = (input.match(/图形类型：\s*([^\n]+)/)?.[1] ?? '').trim();
  const desc = (input.match(/系统描述：\s*([\s\S]+)/)?.[1] ?? input).trim();
  if (type.includes('活动')) {
    return mockActivity(desc);
  }
  if (type.includes('类')) {
    return mockClass(desc);
  }
  return mockUsecase(desc);
}

function mockUsecase(desc: string): string {
  // 先按标点切成小句，再逐句判定「角色声明句(包括…)」或「用例句(X可以Y)」，
  // 避免跨逗号贪婪匹配把后续小句吞进同一项。
  const clauses = desc
    .split(/[，,。.；;\n]/)
    .map((c) => c.trim())
    .filter(Boolean);

  const declaredActors: string[] = [];
  const groups: Array<{ actor: string; cases: string[] }> = [];
  for (const clause of clauses) {
    const useCase = clause.match(/^(.{1,12}?)可以(.+)$/);
    if (useCase) {
      groups.push({ actor: useCase[1]!.trim(), cases: splitItems(useCase[2]!) });
      continue;
    }
    const declaration = clause.match(/(?:包括|包含|有)(.+)$/);
    if (declaration) {
      declaredActors.push(...splitItems(declaration[1]!));
    }
  }

  const actorNames = unique([...declaredActors, ...groups.map((g) => g.actor)]);
  if (actorNames.length === 0) {
    actorNames.push('用户', '管理员');
  }

  const caseNames = unique(groups.flatMap((g) => g.cases));
  if (caseNames.length === 0) {
    caseNames.push('使用核心功能', '查看信息');
  }

  const actorId = (name: string): string => `A${actorNames.indexOf(name)}`;
  const caseId = (name: string): string => `U${caseNames.indexOf(name)}`;

  const lines: string[] = ['@startuml', 'left to right direction', 'skinparam packageStyle rectangle', ''];
  actorNames.forEach((a) => lines.push(`actor "${a}" as ${actorId(a)}`));
  lines.push('', 'rectangle 系统 {');
  caseNames.forEach((c) => lines.push(`  usecase "${c}" as ${caseId(c)}`));
  lines.push('}', '');

  if (groups.length > 0) {
    groups.forEach((g) => g.cases.forEach((c) => lines.push(`${actorId(g.actor)} --> ${caseId(c)}`)));
  } else {
    actorNames.forEach((a) => caseNames.forEach((c) => lines.push(`${actorId(a)} --> ${caseId(c)}`)));
  }
  lines.push('@enduml');
  return lines.join('\n');
}

function mockActivity(desc: string): string {
  const steps = desc
    .split(/[。.；;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
  const actions = steps.length > 0 ? steps : ['接收请求', '校验输入', '处理业务逻辑', '持久化数据', '返回结果'];
  const lines = ['@startuml', 'start'];
  actions.forEach((a) => lines.push(`:${a.slice(0, 24)};`));
  lines.push('stop', '@enduml');
  return lines.join('\n');
}

function mockClass(desc: string): string {
  const sys = (desc.match(/^([^，。,.\s]{1,12})/)?.[1] ?? '系统').trim();
  return [
    '@startuml',
    `class ${sys}核心 {`,
    '  +id: Long',
    '  +name: String',
    '  +createdAt: DateTime',
    '  +process(): void',
    '}',
    'class 用户 {',
    '  +userId: Long',
    '  +login(): boolean',
    '}',
    'class 订单 {',
    '  +orderId: Long',
    '  +amount: Decimal',
    '  +submit(): void',
    '}',
    '用户 "1" --> "*" 订单 : 创建',
    `订单 "*" --> "1" ${sys}核心 : 归属`,
    '@enduml',
  ].join('\n');
}

// ---------- SRS（GB/T 9385 结构） ----------

function mockSrs(input: string): string {
  const name = (input.match(/项目名称：\s*([^\n]+)/)?.[1] ?? '目标系统').trim();
  const background = (input.match(/项目背景：\s*([^\n]+)/)?.[1] ?? '').trim();
  const featureBlock = input.match(/主要功能点：\s*([\s\S]+)/)?.[1] ?? '';
  const features = featureBlock
    .split('\n')
    .map((line) => line.replace(/^[-*\d.、\s]+/, '').trim())
    .filter(Boolean);
  const feats = features.length > 0 ? features : ['核心业务功能'];

  const functionalSections = feats
    .map((feature, index) => {
      const id = `FR-${String(index + 1).padStart(2, '0')}`;
      return [
        `#### ${id} ${feature}`,
        '',
        `- **用户故事**：作为系统用户，我希望「${feature}」，以便高效达成业务目标。`,
        '- **前置条件**：用户已登录且具备相应权限。',
        '- **基本流程**：用户发起操作 → 系统校验输入 → 执行处理 → 返回结果并给出反馈。',
        '- **异常处理**：输入非法或权限不足时，给出明确提示并保持数据一致。',
        `- **验收标准**：「${feature}」在正常与异常路径下均符合预期，关键操作有可观测的成功/失败反馈。`,
        '',
      ].join('\n');
    })
    .join('\n');

  return [
    `# 《${name}》软件需求规格说明书（SRS）`,
    '',
    '> 本文档参照 GB/T 9385《计算机软件需求规格说明规范》组织结构编写。',
    '',
    '## 1 引言',
    '',
    '### 1.1 编写目的',
    `本说明书旨在明确《${name}》的功能与非功能需求，作为设计、开发、测试与验收的共同依据。`,
    '',
    '### 1.2 项目背景',
    background || `《${name}》面向相关业务场景，致力于提升流程效率与用户体验。`,
    '',
    '### 1.3 术语与缩略语',
    '- **SRS**：软件需求规格说明书。',
    '- **干系人**：与系统存在利益关系的个人或组织。',
    '',
    '### 1.4 参考资料',
    '- GB/T 9385 计算机软件需求规格说明规范。',
    '',
    '## 2 总体描述',
    '',
    '### 2.1 产品概述',
    `《${name}》为相关用户提供一体化的在线服务，覆盖核心业务的关键环节。`,
    '',
    '### 2.2 用户特征',
    '- 普通用户：使用核心业务功能。',
    '- 管理员：负责配置与运营维护。',
    '',
    '### 2.3 假设与依赖',
    '- 运行环境具备稳定的网络连接。',
    '- 依赖的第三方服务对外可用。',
    '',
    '## 3 功能需求',
    '',
    functionalSections.trimEnd(),
    '',
    '## 4 非功能需求',
    '',
    '- **性能**：常规操作响应时间 ≤ 2 秒（95 分位）。',
    '- **可用性**：核心服务月可用性 ≥ 99.9%。',
    '- **安全性**：身份认证、最小权限、传输加密、关键操作审计。',
    '- **兼容性**：兼容主流现代浏览器的最新两个版本。',
    '- **可维护性**：模块化设计，核心逻辑具备单元测试覆盖。',
    '',
    '## 5 接口需求',
    '',
    '- **用户接口**：响应式 Web 界面，关键路径具备明确反馈。',
    '- **软件接口**：通过 RESTful API 与后端交互，采用 JSON 数据格式。',
    '',
    '## 6 验收准则',
    '',
    '- 全部功能需求的验收标准均通过验证。',
    '- 非功能指标在压测与安全检查中达标。',
    '',
    '---',
    '_本初稿由系统在离线模式下基于模板生成，请结合实际业务补充完善。_',
  ].join('\n');
}
