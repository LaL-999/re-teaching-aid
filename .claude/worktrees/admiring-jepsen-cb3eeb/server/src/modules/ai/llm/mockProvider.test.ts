import { describe, expect, it } from 'vitest';
import { MockProvider } from './mockProvider';

const provider = new MockProvider();

describe('MockProvider', () => {
  it('访谈提纲：返回 ≥8 个问题且包含领域名', async () => {
    const raw = await provider.complete([{ role: 'user', content: '智慧图书馆' }], {
      tag: 'interview',
    });
    const questions = JSON.parse(raw) as string[];
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThanOrEqual(8);
    expect(questions.join('')).toContain('智慧图书馆');
  });

  it('需求分析与审查：标出「快」和「方便」并给出优化后需求', async () => {
    const raw = await provider.complete([{ role: 'user', content: '系统响应要快，操作要方便' }], {
      tag: 'review',
    });
    const data = JSON.parse(raw) as { issues: Array<{ word: string }>; optimized: string };
    const words = data.issues.map((issue) => issue.word);
    expect(words).toContain('快');
    expect(words).toContain('方便');
    expect(data.optimized).toContain('可度量化改写建议');
  });

  it('UML 用例图：正确解析角色与用例，不把整句当元素', async () => {
    const raw = await provider.complete(
      [
        {
          role: 'user',
          content:
            '图形类型：用例图\n系统描述：外卖系统包括学生顾客、商家、骑手，学生可以提交订单、支付订单，商家可以接单，骑手可以配送',
        },
      ],
      { tag: 'uml' },
    );
    expect(raw).toContain('@startuml');
    expect(raw).toContain('@enduml');
    expect(raw).toContain('actor "商家"');
    expect(raw).toContain('usecase "接单"');
    expect(raw).toContain('usecase "提交订单"');
    // 不应把「X可以Y」整体误当作元素
    expect(raw).not.toContain('可以');
  });

  it('SRS：包含 GB/T 9385 关键章节与用户故事', async () => {
    const raw = await provider.complete(
      [
        {
          role: 'user',
          content: '项目名称：校园外卖系统\n项目背景：演示\n主要功能点：\n- 提交订单\n- 支付订单',
        },
      ],
      { tag: 'srs' },
    );
    expect(raw).toContain('# 《校园外卖系统》');
    expect(raw).toContain('## 3 功能需求');
    expect(raw).toContain('## 4 非功能需求');
    expect(raw).toContain('作为系统用户，我希望');
  });
});
