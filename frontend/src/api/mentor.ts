import { apiFetch } from './client';

export interface MentorMessage {
  role: 'ai' | 'user';
  content: string;
  evaluation?: string | null;
  explanation?: string;
  correct_answer?: string | null;
  assessment?: string | null;
}

export interface MentorSessionItem {
  id: string;
  workspace_id: string;
  topic: string;
  source_ids: string;
  messages: string;
  status: string;
  summary: string | null;
  gap_report: string | null;
  correct_count: number;
  total_questions: number;
  created_at: string;
  updated_at: string;
}

export interface StartSessionResult {
  session: MentorSessionItem;
  first_question: string;
}

export interface RespondResult {
  session_id: string;
  evaluation: string | null;
  explanation: string;
  follow_up_question: string;
  correct_answer: string | null;
  assessment: string | null;
  total_questions: number;
  correct_count: number;
  session_complete: boolean;
}

export interface EndSessionResult {
  session_id: string;
  summary: string;
  gap_report: Array<{ concept: string; explanation: string; suggested_review: string }>;
  topics_covered: string[];
  correct_count: number;
  total_questions: number;
  accuracy_percentage: number;
  strengths: string[];
  weaknesses: string[];
  recommended_focus: string;
}

export async function startMentorSession(
  workspaceId: string,
  topic: string,
  sourceIds: string[] = [],
  context: string = '',
): Promise<StartSessionResult> {
  return apiFetch<StartSessionResult>('/ai/mentor/start', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      topic,
      source_ids: sourceIds,
      context,
    }),
  });
}

export async function respondMentor(
  sessionId: string,
  answer: string,
): Promise<RespondResult> {
  return apiFetch<RespondResult>('/ai/mentor/respond', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, answer }),
  });
}

export async function endMentorSession(
  sessionId: string,
): Promise<EndSessionResult> {
  return apiFetch<EndSessionResult>(`/ai/mentor/${sessionId}/end`, {
    method: 'POST',
  });
}

export async function fetchMentorSessions(
  workspaceId: string,
  status?: string,
): Promise<MentorSessionItem[]> {
  const params = new URLSearchParams({ workspace_id: workspaceId });
  if (status) params.set('status', status);
  return apiFetch<MentorSessionItem[]>(`/ai/mentor/sessions?${params}`);
}

export async function fetchMentorSession(
  sessionId: string,
): Promise<MentorSessionItem> {
  return apiFetch<MentorSessionItem>(`/ai/mentor/${sessionId}`);
}

export async function deleteMentorSession(
  sessionId: string,
): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/ai/mentor/${sessionId}`, {
    method: 'DELETE',
  });
}
