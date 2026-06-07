export type UmlDiagramType = 'usecase' | 'activity' | 'class';

export const UML_DIAGRAM_LABELS: Record<UmlDiagramType, string> = {
  usecase: '用例图',
  activity: '活动图',
  class: '类图',
};

export function isUmlDiagramType(value: string): value is UmlDiagramType {
  return value === 'usecase' || value === 'activity' || value === 'class';
}

export interface SrsInput {
  projectName: string;
  features: string[];
  background: string;
  /** 上游（如「需求分析与审查」）流转下来的需求素材，作为生成 SRS 的额外依据。 */
  material?: string;
  /** 仅补充某一章节时使用，目前支持「非功能需求」。 */
  supplement?: 'nonfunctional';
}

export interface QualityIssue {
  word: string;
  type: string;
  reason: string;
  suggestion: string;
}

export type AiMode = 'live' | 'mock';
