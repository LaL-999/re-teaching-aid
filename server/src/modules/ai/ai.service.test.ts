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

  it('SRS：缺少名称或功能点 → 请填写项目名称和至少一个功能点', async () => {
    await expect(
      aiService.srs({ projectName: '', features: [], background: '' }),
    ).rejects.toThrowError('请填写项目名称和至少一个功能点');
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

  it('审核优化：离线模式原样返回内容', async () => {
    const result = await aiService.refine('i* 目标建模', 'actor 用户 { goal "下单" }');
    expect(result.refined).toContain('actor 用户');
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
});
