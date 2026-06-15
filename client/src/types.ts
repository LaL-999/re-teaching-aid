export type Role = 'teacher' | 'student';

export interface AuthUser {
  id: number;
  studentId: string;
  name: string;
  role: Role;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface ModuleDto {
  id: number;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  resourceCount: number;
}

export interface ResourceDto {
  id: number;
  moduleId: number;
  moduleCode: string;
  moduleName: string;
  name: string;
  description: string;
  originalFilename: string;
  ext: string;
  mimeType: string;
  size: number;
  uploaderName: string;
  createdAt: string;
  previewable: boolean;
  previewUrl: string;
  downloadUrl: string;
}

export interface QualityIssue {
  word: string;
  type: string;
  reason: string;
  suggestion: string;
}

export interface MySubmission {
  content: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  graded: boolean;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  moduleId: number | null;
  moduleName: string | null;
  dueDate: string | null;
  createdAt: string;
  submissionCount?: number;
  gradedCount?: number;
  mySubmission?: MySubmission | null;
}

export interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  studentName: string;
  studentNo: string;
  content: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  graded: boolean;
}

export type UmlDiagramType = 'usecase' | 'activity' | 'class';

export type AiMode = 'live' | 'mock';

export interface AiStatus {
  mode: AiMode;
  model: string;
}

/** 需求追踪矩阵的一条链：需求条目 ↔ SRS 章节 ↔ 系统组件。 */
export interface TraceLink {
  reqId: string;
  requirement: string;
  srsRef: string;
  component: string;
  status: string;
}

/** 提示词工坊：流水线某阶段的可编辑输出格式提示词。 */
export type PromptStageKey =
  | 'overview'
  | 'interview'
  | 'requirements'
  | 'review'
  | 'istar'
  | 'uml'
  | 'srs'
  | 'trace';

export interface PromptTemplate {
  key: PromptStageKey;
  label: string;
  description: string;
  output: 'markdown' | 'json' | 'code';
  /** 当前生效的提示词（覆盖优先，否则默认） */
  system: string;
  /** 出厂默认提示词，用于「重置」对照 */
  default: string;
  /** 是否已被教师自定义覆盖 */
  isCustom: boolean;
}
