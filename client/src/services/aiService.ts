import { http } from './http';
import type { AiMode, AiStatus, QualityIssue, UmlDiagramType } from '../types';

export const aiService = {
  async status(): Promise<AiStatus> {
    const { data } = await http.get<AiStatus>('/api/ai/status');
    return data;
  },

  // ① 产品概要
  async overview(idea: string): Promise<{ overview: string; mode: AiMode }> {
    const { data } = await http.post<{ overview: string; mode: AiMode }>('/api/ai/overview', {
      idea,
    });
    return data;
  },

  // ③ 具体需求
  async requirements(source: string): Promise<{ requirements: string; mode: AiMode }> {
    const { data } = await http.post<{ requirements: string; mode: AiMode }>(
      '/api/ai/requirements',
      { source },
    );
    return data;
  },

  // ④ 需求分析与审查（含原「质量检查」能力 + 优化后需求）
  async review(
    text: string,
  ): Promise<{ issues: QualityIssue[]; summary: string; optimized: string; mode: AiMode }> {
    const { data } = await http.post<{
      issues: QualityIssue[];
      summary: string;
      optimized: string;
      mode: AiMode;
    }>('/api/ai/review', { text });
    return data;
  },

  // 通用「审核并优化」
  async refine(stage: string, content: string): Promise<{ refined: string; mode: AiMode }> {
    const { data } = await http.post<{ refined: string; mode: AiMode }>('/api/ai/refine', {
      stage,
      content,
    });
    return data;
  },

  async interview(domain: string): Promise<{ questions: string[]; mode: AiMode }> {
    const { data } = await http.post<{ questions: string[]; mode: AiMode }>('/api/ai/interview', {
      domain,
    });
    return data;
  },

  async istar(requirement: string): Promise<{ code: string; mode: AiMode }> {
    const { data } = await http.post<{ code: string; mode: AiMode }>('/api/ai/istar', {
      requirement,
    });
    return data;
  },

  async generateUml(
    description: string,
    diagramType: UmlDiagramType,
  ): Promise<{ code: string; mode: AiMode }> {
    const { data } = await http.post<{ code: string; mode: AiMode }>('/api/ai/uml/generate', {
      description,
      diagramType,
    });
    return data;
  },

  async renderUml(code: string): Promise<{ svg: string; externalUrl: string }> {
    const { data } = await http.post<{ svg: string; externalUrl: string }>('/api/ai/uml/render', {
      code,
    });
    return data;
  },

  async srs(input: {
    projectName: string;
    features: string[];
    background?: string;
    material?: string;
    supplement?: 'nonfunctional';
  }): Promise<{ markdown: string; html: string; mode: AiMode }> {
    const { data } = await http.post<{ markdown: string; html: string; mode: AiMode }>(
      '/api/ai/srs',
      input,
    );
    return data;
  },
};
