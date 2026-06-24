import { apiFetch } from './client';

export interface QuizItem {
  id: string;
  workspace_id: string;
  source_id: string | null;
  title: string;
  quiz_type: string;
  questions: string;
  metadata_json: string;
  time_limit_minutes: number | null;
  score: number | null;
  max_score: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizSubmitResult {
  quiz_id: string;
  score: number;
  max_score: number;
  percentage: number;
  completed_at: string;
}

export const QUIZ_TYPES = [
  'mcq',
  'coding',
  'short_answer',
  'long_answer',
  'case_study',
  'interview',
] as const;

export type QuizType = typeof QUIZ_TYPES[number];

export const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  mcq: 'Multiple Choice',
  coding: 'Coding',
  short_answer: 'Short Answer',
  long_answer: 'Long Answer',
  case_study: 'Case Study',
  interview: 'Interview',
};

export const QUIZ_TYPE_ICONS: Record<QuizType, string> = {
  mcq: '📝',
  coding: '💻',
  short_answer: '✏️',
  long_answer: '📄',
  case_study: '🔍',
  interview: '🎤',
};

export async function fetchQuizzes(
  workspaceId: string,
  sourceId?: string,
  quizType?: string,
): Promise<QuizItem[]> {
  const params = new URLSearchParams({ workspace_id: workspaceId });
  if (sourceId) params.set('source_id', sourceId);
  if (quizType) params.set('quiz_type', quizType);
  return apiFetch<QuizItem[]>(`/ai/quiz/?${params}`);
}

export async function getQuiz(quizId: string): Promise<QuizItem> {
  return apiFetch<QuizItem>(`/ai/quiz/${quizId}`);
}

export async function generateQuiz(
  sourceId: string,
  quizType: string = 'mcq',
  count: number = 5,
  timeLimitMinutes?: number,
): Promise<QuizItem> {
  return apiFetch<QuizItem>('/ai/quiz/generate', {
    method: 'POST',
    body: JSON.stringify({
      source_id: sourceId,
      quiz_type: quizType,
      count,
      time_limit_minutes: timeLimitMinutes ?? null,
    }),
  });
}

export async function createQuiz(
  workspaceId: string,
  title: string,
  quizType: string,
  questions: string,
  sourceId?: string,
  timeLimitMinutes?: number,
): Promise<QuizItem> {
  return apiFetch<QuizItem>('/ai/quiz/', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      source_id: sourceId ?? null,
      title,
      quiz_type: quizType,
      questions,
      time_limit_minutes: timeLimitMinutes ?? null,
    }),
  });
}

export async function submitQuiz(
  quizId: string,
  answers: { question_id: string; answer: string | number | null }[],
): Promise<QuizSubmitResult> {
  return apiFetch<QuizSubmitResult>(`/ai/quiz/${quizId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export async function deleteQuiz(quizId: string): Promise<void> {
  await apiFetch(`/ai/quiz/${quizId}`, { method: 'DELETE' });
}
