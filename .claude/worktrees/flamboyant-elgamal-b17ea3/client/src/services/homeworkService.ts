import { http } from './http';
import type { Assignment, MySubmission, Submission } from '../types';

export interface CreateAssignmentInput {
  title: string;
  description: string;
  moduleId: number | null;
  dueDate: string | null;
}

export const homeworkService = {
  async list(): Promise<Assignment[]> {
    const { data } = await http.get<{ assignments: Assignment[] }>('/api/homework/assignments');
    return data.assignments;
  },

  async create(input: CreateAssignmentInput): Promise<Assignment> {
    const { data } = await http.post<{ assignment: Assignment }>(
      '/api/homework/assignments',
      input,
    );
    return data.assignment;
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/api/homework/assignments/${id}`);
  },

  async listSubmissions(assignmentId: number): Promise<Submission[]> {
    const { data } = await http.get<{ submissions: Submission[] }>(
      `/api/homework/assignments/${assignmentId}/submissions`,
    );
    return data.submissions;
  },

  async submit(assignmentId: number, content: string): Promise<MySubmission> {
    const { data } = await http.post<{ submission: MySubmission }>(
      `/api/homework/assignments/${assignmentId}/submit`,
      { content },
    );
    return data.submission;
  },

  async grade(submissionId: number, score: number, feedback: string): Promise<void> {
    await http.post(`/api/homework/submissions/${submissionId}/grade`, { score, feedback });
  },
};
