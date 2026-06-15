/** 需求工程流水线的车间定义（顺序即生产顺序）。菜单、流水线导航、阶段间流转共用此处。 */
export interface PipelineStage {
  key: string;
  /** 序号符，如 ① */
  num: string;
  label: string;
  to: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { key: 'overview', num: '①', label: '产品概要', to: '/app/tools/overview' },
  { key: 'interview', num: '②', label: '访谈提纲', to: '/app/tools/interview' },
  { key: 'requirements', num: '③', label: '具体需求', to: '/app/tools/requirements' },
  { key: 'review', num: '④', label: '需求分析与审查', to: '/app/tools/review' },
  { key: 'istar', num: '⑤', label: 'i* 目标建模', to: '/app/tools/istar' },
  { key: 'uml', num: '⑥', label: 'UML 建模', to: '/app/tools/uml' },
  { key: 'srs', num: '⑦', label: 'SRS 说明书', to: '/app/tools/srs' },
  { key: 'trace', num: '⑧', label: '需求追踪', to: '/app/tools/trace' },
];
