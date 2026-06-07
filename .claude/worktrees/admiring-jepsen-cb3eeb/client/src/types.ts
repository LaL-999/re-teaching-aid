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
