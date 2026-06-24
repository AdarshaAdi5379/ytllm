import { apiFetch } from './client';

export interface DueFlashcardItem {
  id: string;
  question: string;
  answer: string;
  difficulty: string;
  total_reviews: number;
  correct_reviews: number;
}

export interface WeakAreaItem {
  question: string;
  difficulty: string;
  total_reviews: number;
  correct_rate: number;
}

export interface MissedQuestionItem {
  quiz_id: string;
  quiz_title: string;
  question: string;
  type: string;
  options?: string[];
  correct_answer?: number;
  explanation: string;
}

export interface LowScoreQuizItem {
  id: string;
  title: string;
  quiz_type: string;
  score: number;
  max_score: number;
  percentage: number;
}

export interface ActivityItem {
  reviews_last_7d: number;
  quizzes_last_7d: number;
  streak_days: number;
}

export interface LearningPathProgress {
  path_id: string;
  title: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface DailyRevisionSummary {
  date: string;
  flashcards: {
    total: number;
    due_today: number;
    reviewed_today: number;
    due: DueFlashcardItem[];
  };
  weak_areas: WeakAreaItem[];
  missed_questions: MissedQuestionItem[];
  low_score_quizzes: LowScoreQuizItem[];
  activity: ActivityItem;
  learning_path: LearningPathProgress | null;
}

export async function fetchDailyRevisionSummary(
  workspaceId: string,
): Promise<DailyRevisionSummary> {
  return apiFetch<DailyRevisionSummary>(
    `/ai/daily-revision/summary?workspace_id=${workspaceId}`,
  );
}

export async function fetchRevisionSuggestions(
  workspaceId: string,
): Promise<{ suggestions: string }> {
  return apiFetch<{ suggestions: string }>(
    `/ai/daily-revision/suggestions?workspace_id=${workspaceId}`,
  );
}
