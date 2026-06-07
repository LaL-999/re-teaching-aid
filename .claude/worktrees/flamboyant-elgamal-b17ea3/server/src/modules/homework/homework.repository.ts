import { getDb } from '../../db';

export interface AssignmentRow {
  id: number;
  title: string;
  description: string;
  module_id: number | null;
  due_date: string | null;
  created_by: number;
  created_at: string;
}

export interface AssignmentListRow extends AssignmentRow {
  module_name: string | null;
  submission_count: number;
  graded_count: number;
}

export interface SubmissionRow {
  id: number;
  assignment_id: number;
  student_id: number;
  content: string;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
}

export interface SubmissionWithStudentRow extends SubmissionRow {
  student_name: string;
  student_no: string;
}

export interface NewAssignment {
  title: string;
  description: string;
  moduleId: number | null;
  dueDate: string | null;
  createdBy: number;
}

const ASSIGNMENT_LIST_SELECT = `
  SELECT a.*, m.name AS module_name,
         COUNT(s.id)    AS submission_count,
         COUNT(s.score) AS graded_count
  FROM assignments a
  LEFT JOIN modules m ON m.id = a.module_id
  LEFT JOIN submissions s ON s.assignment_id = a.id
`;

export const homeworkRepository = {
  insertAssignment(input: NewAssignment): number {
    const info = getDb()
      .prepare(
        `INSERT INTO assignments (title, description, module_id, due_date, created_by)
         VALUES (@title, @description, @moduleId, @dueDate, @createdBy)`,
      )
      .run(input);
    return Number(info.lastInsertRowid);
  },

  listAssignments(): AssignmentListRow[] {
    return getDb()
      .prepare(`${ASSIGNMENT_LIST_SELECT} GROUP BY a.id ORDER BY a.created_at DESC, a.id DESC`)
      .all() as AssignmentListRow[];
  },

  findAssignmentById(id: number): AssignmentRow | undefined {
    return getDb().prepare('SELECT * FROM assignments WHERE id = ?').get(id) as
      | AssignmentRow
      | undefined;
  },

  findAssignmentWithModule(
    id: number,
  ): (AssignmentRow & { module_name: string | null }) | undefined {
    return getDb()
      .prepare(
        `SELECT a.*, m.name AS module_name
         FROM assignments a LEFT JOIN modules m ON m.id = a.module_id
         WHERE a.id = ?`,
      )
      .get(id) as (AssignmentRow & { module_name: string | null }) | undefined;
  },

  deleteAssignment(id: number): void {
    getDb().prepare('DELETE FROM assignments WHERE id = ?').run(id);
  },

  listSubmissionsByAssignment(assignmentId: number): SubmissionWithStudentRow[] {
    return getDb()
      .prepare(
        `SELECT s.*, u.name AS student_name, u.student_id AS student_no
         FROM submissions s JOIN users u ON u.id = s.student_id
         WHERE s.assignment_id = ?
         ORDER BY s.submitted_at DESC, s.id DESC`,
      )
      .all(assignmentId) as SubmissionWithStudentRow[];
  },

  listSubmissionsByStudent(studentId: number): SubmissionRow[] {
    return getDb()
      .prepare('SELECT * FROM submissions WHERE student_id = ?')
      .all(studentId) as SubmissionRow[];
  },

  findSubmission(assignmentId: number, studentId: number): SubmissionRow | undefined {
    return getDb()
      .prepare('SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?')
      .get(assignmentId, studentId) as SubmissionRow | undefined;
  },

  findSubmissionById(id: number): SubmissionRow | undefined {
    return getDb().prepare('SELECT * FROM submissions WHERE id = ?').get(id) as
      | SubmissionRow
      | undefined;
  },

  /** 学生提交：每生每作业唯一，重复提交即覆盖内容并重置批改状态。 */
  upsertSubmission(assignmentId: number, studentId: number, content: string): void {
    getDb()
      .prepare(
        `INSERT INTO submissions (assignment_id, student_id, content)
         VALUES (?, ?, ?)
         ON CONFLICT(assignment_id, student_id)
         DO UPDATE SET content = excluded.content,
                       submitted_at = datetime('now', 'localtime'),
                       score = NULL, feedback = NULL, graded_at = NULL`,
      )
      .run(assignmentId, studentId, content);
  },

  gradeSubmission(id: number, score: number, feedback: string): void {
    getDb()
      .prepare(
        `UPDATE submissions
         SET score = ?, feedback = ?, graded_at = datetime('now', 'localtime')
         WHERE id = ?`,
      )
      .run(score, feedback, id);
  },

  countAssignments(): number {
    const row = getDb().prepare('SELECT COUNT(*) AS c FROM assignments').get() as { c: number };
    return row.c;
  },
};
