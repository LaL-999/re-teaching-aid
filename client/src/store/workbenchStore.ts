import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { QualityIssue, UmlDiagramType } from '../types';

/** 从 localStorage 中读取当前登录用户的 id，用于隔离不同用户的工作台数据。 */
function currentUserId(): string {
  try {
    const raw = localStorage.getItem('reta-auth');
    if (!raw) return 'guest';
    const parsed = JSON.parse(raw) as { state?: { user?: { id?: number } } };
    return String(parsed?.state?.user?.id ?? 'guest');
  } catch {
    return 'guest';
  }
}

/**
 * 流水线工作台：保存 7 个车间各自的输入与产物。
 * 因状态独立于组件存在并持久化到 localStorage，切换 tab 与刷新页面后内容均不丢失。
 */
export interface OverviewState {
  idea: string;
  overview: string;
}
export interface InterviewState {
  domain: string;
  questions: string[];
}
export interface RequirementsState {
  source: string;
  requirements: string;
}
export interface ReviewState {
  text: string;
  issues: QualityIssue[];
  summary: string;
  optimized: string;
}
export interface IstarState {
  requirement: string;
  code: string;
}
export interface UmlState {
  description: string;
  diagramType: UmlDiagramType | '';
  code: string;
}
export interface SrsState {
  projectName: string;
  background: string;
  featuresText: string;
  material: string;
  markdown: string;
  html: string;
}

export interface WorkbenchData {
  overview: OverviewState;
  interview: InterviewState;
  requirements: RequirementsState;
  review: ReviewState;
  istar: IstarState;
  uml: UmlState;
  srs: SrsState;
}

function emptyData(): WorkbenchData {
  return {
    overview: { idea: '', overview: '' },
    interview: { domain: '', questions: [] },
    requirements: { source: '', requirements: '' },
    review: { text: '', issues: [], summary: '', optimized: '' },
    istar: { requirement: '', code: '' },
    uml: { description: '', diagramType: '', code: '' },
    srs: { projectName: '', background: '', featuresText: '', material: '', markdown: '', html: '' },
  };
}

interface WorkbenchStore {
  data: WorkbenchData;
  /** 合并更新某个车间的部分字段 */
  patch: <K extends keyof WorkbenchData>(key: K, partial: Partial<WorkbenchData[K]>) => void;
  /** 清空某个车间 */
  reset: (key: keyof WorkbenchData) => void;
  /** 清空全部车间 */
  resetAll: () => void;
}

export const useWorkbench = create<WorkbenchStore>()(
  persist(
    (set) => ({
      data: emptyData(),
      patch: (key, partial) =>
        set((state) => ({
          data: { ...state.data, [key]: { ...state.data[key], ...partial } },
        })),
      reset: (key) =>
        set((state) => ({ data: { ...state.data, [key]: emptyData()[key] } })),
      resetAll: () => set({ data: emptyData() }),
    }),
    {
      name: `reta-workbench-${currentUserId()}`,
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
