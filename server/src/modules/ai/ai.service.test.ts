import { describe, expect, it, vi } from 'vitest';

// 强制走离线 Mock，使单测与「是否配置真实大模型 / 网络」解耦，结果确定可重复。
vi.mock('./llm', async () => {
  const { MockProvider } = await import('./llm/mockProvider');
  const provider = new MockProvider();
  return {
    getLlmProvider: () => provider,
    isUsingMock: () => true,
    llmStatus: () => ({ mode: 'mock' as const, model: 'offline-mock' }),
  };
});

import { aiService } from './ai.service';

describe('aiService 输入校验（对应验收异常场景）', () => {
  it('访谈：空领域 → 请输入项目领域', async () => {
    await expect(aiService.interview('   ')).rejects.toThrowError('请输入项目领域');
  });

  it('i*：描述过简 → 需求描述过于简单，请补充更多细节', async () => {
    await expect(aiService.istar('配送快')).rejects.toThrowError(
      '需求描述过于简单，请补充更多细节',
    );
  });

  it('需求分析与审查：空文本 → 请输入需求文本', async () => {
    await expect(aiService.review('')).rejects.toThrowError('请输入需求文本');
  });

  it('产品概要：空想法 → 请输入产品想法或项目领域', async () => {
    await expect(aiService.overview('  ')).rejects.toThrowError('请输入产品想法或项目领域');
  });

  it('审核优化：空内容 → 没有可优化的内容', async () => {
    await expect(aiService.refine('产品概要', '')).rejects.toThrowError('没有可优化的内容');
  });

  it('UML：未选图形类型 → 请选择UML图形类型', async () => {
    await expect(
      aiService.generateUml('外卖系统包括学生、商家、骑手，学生可以下单', ''),
    ).rejects.toThrowError('请选择UML图形类型');
  });

  it('UML：描述过简 → 提示提供更详细说明', async () => {
    await expect(aiService.generateUml('外卖系统', 'usecase')).rejects.toThrowError(
      '需求描述过于简单',
    );
  });

  it('SRS：既无素材也无名称/功能点 → 提示二者其一', async () => {
    await expect(
      aiService.srs({ projectName: '', features: [], background: '' }),
    ).rejects.toThrowError('请提供上游需求素材，或填写项目名称和至少一个功能点');
  });

  it('需求追踪：缺少需求或 SRS → 请提供两份内容', async () => {
    await expect(aiService.trace('', 'srs 内容')).rejects.toThrowError(
      '请提供「具体需求」与「SRS 文档」两份内容',
    );
  });
});

describe('aiService 正常路径（离线 Mock）', () => {
  it('访谈生成 ≥8 个问题', async () => {
    const result = await aiService.interview('智慧图书馆');
    expect(result.questions.length).toBeGreaterThanOrEqual(8);
    expect(result.mode).toBe('mock');
  });

  it('需求分析与审查：标出模糊词并产出优化后需求', async () => {
    const result = await aiService.review('系统响应要快，操作要方便');
    expect(result.issues.map((i) => i.word)).toContain('快');
    expect(result.optimized.length).toBeGreaterThan(0);
  });

  it('产品概要：生成含五个小节的 Markdown', async () => {
    const result = await aiService.overview('校园外卖系统');
    expect(result.overview).toContain('产品概要');
    expect(result.overview).toContain('核心功能概要');
  });

  it('具体需求：生成含用户故事的清单', async () => {
    const result = await aiService.requirements('# 概要\n## 五、核心功能概要\n- 下单\n- 支付');
    expect(result.requirements).toContain('用户故事');
  });

  it('审核优化：返回优化后内容 + 改动说明', async () => {
    const result = await aiService.refine('i* 目标建模', 'actor 用户 { goal "下单" }');
    expect(result.refined).toContain('actor 用户');
    expect(result.refined).not.toContain('===优化后内容===');
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('SRS 返回 markdown 与 html', async () => {
    const result = await aiService.srs({
      projectName: '校园外卖系统',
      features: ['提交订单'],
      background: '',
    });
    expect(result.markdown).toContain('# 《校园外卖系统》');
    expect(result.html).toContain('<!doctype html>');
  });

  it('SRS 素材驱动：仅有上游素材也能生成（无需手填名称/功能点）', async () => {
    const result = await aiService.srs({
      projectName: '',
      features: [],
      background: '',
      material: '# 校园外卖系统\n## 五、核心功能概要\n- 下单\n- 支付',
    });
    expect(result.markdown.length).toBeGreaterThan(0);
    expect(result.html).toContain('<!doctype html>');
  });

  it('i*：离线生成结构化 JSON（actors + links，可被 piStar 转换）', async () => {
    const result = await aiService.istar('顾客希望准时收到外卖，商家希望快速出餐');
    const parsed = JSON.parse(result.code) as { actors?: unknown[]; istar?: string };
    expect(Array.isArray(parsed.actors)).toBe(true);
    expect(parsed.actors!.length).toBeGreaterThan(0);
    expect(parsed.istar).toBe('2.0');
  });

  it('需求追踪：建立需求↔系统链路', async () => {
    const result = await aiService.trace(
      '# 具体功能需求\n## 模块 1：在线下单\n## 模块 2：支付订单',
      '# SRS\n## 3 功能需求\n### FR-01 在线下单\n### FR-02 支付订单',
    );
    expect(result.links.length).toBeGreaterThan(0);
    expect(result.links[0]).toHaveProperty('status');
  });
});
