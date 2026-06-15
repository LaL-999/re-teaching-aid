import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { QualityIssue, TraceLink, UmlDiagramType } from '../types';

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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * 流水线工作台：保存 8 个车间各自的输入与产物，并为每个车间维护「产物版本树」。
 * 因状态独立于组件存在并持久化到 localStorage，切 tab 与刷新均不丢；按用户 id 隔离。
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
export interface TraceState {
  requirements: string;
  srs: string;
  links: TraceLink[];
  summary: string;
}

export interface WorkbenchData {
  overview: OverviewState;
  interview: InterviewState;
  requirements: RequirementsState;
  review: ReviewState;
  istar: IstarState;
  uml: UmlState;
  srs: SrsState;
  trace: TraceState;
}

export type StageKey = keyof WorkbenchData;

function emptyData(): WorkbenchData {
  return {
    overview: { idea: '', overview: '' },
    interview: { domain: '', questions: [] },
    requirements: { source: '', requirements: '' },
    review: { text: '', issues: [], summary: '', optimized: '' },
    istar: { requirement: '', code: '' },
    uml: { description: '', diagramType: '', code: '' },
    srs: { projectName: '', background: '', featuresText: '', material: '', markdown: '', html: '' },
    trace: { requirements: '', srs: '', links: [], summary: '' },
  };
}

/** 产物版本树中的一个版本（快照 + 主文本预览 + 是否标记为最佳）。 */
export interface VersionEntry<T> {
  id: string;
  label: string;
  createdAt: string;
  /** 主产物文本，用于时间线预览与版本对比 */
  text: string;
  /** 该车间的完整状态快照，用于回滚 */
  snapshot: T;
  starred: boolean;
}

export type VersionMap = {
  [K in StageKey]: Array<VersionEntry<WorkbenchData[K]>>;
};

function emptyVersions(): VersionMap {
  return {
    overview: [],
    interview: [],
    requirements: [],
    review: [],
    istar: [],
    uml: [],
    srs: [],
    trace: [],
  };
}

const MAX_VERSIONS = 30;
let versionCounter = 0;
function newVersionId(): string {
  versionCounter += 1;
  return `v${Date.now().toString(36)}-${versionCounter}`;
}

interface WorkbenchStore {
  data: WorkbenchData;
  versions: VersionMap;
  /** 合并更新某个车间的部分字段 */
  patch: <K extends StageKey>(key: K, partial: Partial<WorkbenchData[K]>) => void;
  /** 清空某个车间（含其版本树） */
  reset: (key: StageKey) => void;
  /** 清空全部车间与版本树 */
  resetAll: () => void;
  /** 将当前车间状态存为一个新版本（最新置顶） */
  saveVersion: <K extends StageKey>(key: K, label: string, text: string) => void;
  /** 回滚到某个版本（把快照写回当前工作态） */
  restoreVersion: (key: StageKey, id: string) => void;
  /** 标记 / 取消标记「最佳版本」 */
  toggleStar: (key: StageKey, id: string) => void;
  /** 删除某个版本 */
  deleteVersion: (key: StageKey, id: string) => void;
}

/** 判断某车间是否已产出产物（供流水线导航/驾驶舱显示「已完成」状态）。 */
export function stageHasOutput(data: WorkbenchData, key: StageKey): boolean {
  switch (key) {
    case 'overview':
      return Boolean(data.overview.overview.trim());
    case 'interview':
      return data.interview.questions.length > 0;
    case 'requirements':
      return Boolean(data.requirements.requirements.trim());
    case 'review':
      return Boolean(data.review.optimized.trim()) || data.review.issues.length > 0;
    case 'istar':
      return Boolean(data.istar.code.trim());
    case 'uml':
      return Boolean(data.uml.code.trim());
    case 'srs':
      return Boolean(data.srs.markdown.trim());
    case 'trace':
      return data.trace.links.length > 0;
    default:
      return false;
  }
}

export const useWorkbench = create<WorkbenchStore>()(
  persist(
    (set) => ({
      data: emptyData(),
      versions: emptyVersions(),
      patch: (key, partial) =>
        set((state) => ({
          data: { ...state.data, [key]: { ...state.data[key], ...partial } },
        })),
      reset: (key) =>
        set((state) => ({
          data: { ...state.data, [key]: emptyData()[key] },
          versions: { ...state.versions, [key]: [] },
        })),
      resetAll: () => set({ data: emptyData(), versions: emptyVersions() }),
      saveVersion: (key, label, text) =>
        set((state) => {
          const entry: VersionEntry<WorkbenchData[typeof key]> = {
            id: newVersionId(),
            label,
            createdAt: new Date().toISOString(),
            text,
            snapshot: clone(state.data[key]),
            starred: false,
          };
          const list = [entry, ...state.versions[key]].slice(0, MAX_VERSIONS);
          return { versions: { ...state.versions, [key]: list } };
        }),
      restoreVersion: (key, id) =>
        set((state) => {
          const entry = state.versions[key].find((v) => v.id === id);
          if (!entry) return {};
          return { data: { ...state.data, [key]: clone(entry.snapshot) } };
        }),
      toggleStar: (key, id) =>
        set((state) => ({
          versions: {
            ...state.versions,
            [key]: state.versions[key].map((v) =>
              v.id === id ? { ...v, starred: !v.starred } : v,
            ),
          },
        })),
      deleteVersion: (key, id) =>
        set((state) => ({
          versions: {
            ...state.versions,
            [key]: state.versions[key].filter((v) => v.id !== id),
          },
        })),
    }),
    {
      name: `reta-workbench-${currentUserId()}`,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // 旧版本（v1，无 trace 阶段 / 无 versions）平滑迁移，避免读到 undefined
      migrate: (persisted: unknown) => {
        const prev = (persisted ?? {}) as Partial<WorkbenchStore>;
        return {
          ...prev,
          data: { ...emptyData(), ...(prev.data ?? {}) },
          versions: { ...emptyVersions(), ...(prev.versions ?? {}) },
        } as WorkbenchStore;
      },
    },
  ),
);
