import { AppError } from '../../middleware/error';
import { moduleRepository } from '../catalog/module.repository';
import {
  homeworkRepository,
  type AssignmentListRow,
  type AssignmentRow,
  type SubmissionRow,
  type SubmissionWithStudentRow,
} from './homework.repository';

export interface MySubmissionDto {
  content: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  graded: boolean;
}

export interface AssignmentDto {
  id: number;
  title: string;
  description: string;
  moduleId: number | null;
  moduleName: string | null;
  dueDate: string | null;
  createdAt: string;
  submissionCount?: number;
  gradedCount?: number;
  mySubmission?: MySubmissionDto | null;
}

export interface SubmissionDto {
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

export interface CreateAssignmentInput {
  title: string;
  description: string;
  moduleId: number | null;
  dueDate: string | null;
}

function toMySubmissionDto(row: SubmissionRow): MySubmissionDto {
  return {
    content: row.content,
    score: row.score,
    feedback: row.feedback,
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at,
    graded: row.score !== null,
  };
}

function toSubmissionDto(row: SubmissionWithStudentRow): SubmissionDto {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    studentName: row.student_name,
    studentNo: row.student_no,
    content: row.content,
    score: row.score,
    feedback: row.feedback,
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at,
    graded: row.score !== null,
  };
}

function baseAssignmentDto(
  row: AssignmentRow & { module_name?: string | null },
): AssignmentDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    moduleId: row.module_id,
    moduleName: row.module_name ?? null,
    dueDate: row.due_date,
    createdAt: row.created_at,
  };
}

function teacherAssignmentDto(row: AssignmentListRow): AssignmentDto {
  return {
    ...baseAssignmentDto(row),
    submissionCount: row.submission_count,
    gradedCount: row.graded_count,
  };
}

export const homeworkService = {
  createAssignment(input: CreateAssignmentInput, teacherId: number): AssignmentDto {
    const title = input.title.trim();
    if (!title) {
      throw new AppError(400, '请输入作业标题');
    }
    if (input.moduleId !== null && !moduleRepository.findById(input.moduleId)) {
      throw new AppError(400, '所选模块不存在');
    }
    const id = homeworkRepository.insertAssignment({
      title,
      description: input.description.trim(),
      moduleId: input.moduleId,
      dueDate: input.dueDate,
      createdBy: teacherId,
    });
    const row = homeworkRepository.findAssignmentWithModule(id);
    if (!row) {
      throw new AppError(500, '作业创建失败');
    }
    return baseAssignmentDto(row);
  },

  listForTeacher(): AssignmentDto[] {
    return homeworkRepository.listAssignments().map(teacherAssignmentDto);
  },

  listForStudent(studentId: number): AssignmentDto[] {
    const assignments = homeworkRepository.listAssignments();
    const mine = new Map<number, SubmissionRow>();
    for (const submission of homeworkRepository.listSubmissionsByStudent(studentId)) {
      mine.set(submission.assignment_id, submission);
    }
    return assignments.map((row) => {
      const submission = mine.get(row.id);
      return {
        ...baseAssignmentDto(row),
        mySubmission: submission ? toMySubmissionDto(submission) : null,
      };
    });
  },

  removeAssignment(id: number): void {
    if (!homeworkRepository.findAssignmentById(id)) {
      throw new AppError(404, '作业不存在');
    }
    homeworkRepository.deleteAssignment(id);
  },

  listSubmissions(assignmentId: number): SubmissionDto[] {
    if (!homeworkRepository.findAssignmentById(assignmentId)) {
      throw new AppError(404, '作业不存在');
    }
    return homeworkRepository.listSubmissionsByAssignment(assignmentId).map(toSubmissionDto);
  },

  submit(assignmentId: number, studentId: number, content: string): MySubmissionDto {
    if (!homeworkRepository.findAssignmentById(assignmentId)) {
      throw new AppError(404, '作业不存在');
    }
    const trimmed = content.trim();
    if (!trimmed) {
      throw new AppError(400, '请输入作业内容');
    }
    homeworkRepository.upsertSubmission(assignmentId, studentId, trimmed);
    const row = homeworkRepository.findSubmission(assignmentId, studentId);
    if (!row) {
      throw new AppError(500, '提交失败');
    }
    return toMySubmissionDto(row);
  },

  getMySubmission(assignmentId: number, studentId: number): MySubmissionDto | null {
    const row = homeworkRepository.findSubmission(assignmentId, studentId);
    return row ? toMySubmissionDto(row) : null;
  },

  grade(submissionId: number, score: number, feedback: string): void {
    const row = homeworkRepository.findSubmissionById(submissionId);
    if (!row) {
      throw new AppError(404, '提交不存在');
    }
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      throw new AppError(400, '分数需为 0-100 的整数');
    }
    homeworkRepository.gradeSubmission(submissionId, score, feedback.trim());
  },
};
