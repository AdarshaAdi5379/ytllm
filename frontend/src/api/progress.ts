import { apiFetch } from './client';

export interface TopicTime {
  topic: string;
  minutes: number;
}

export interface DailyActivity {
  date: string;
  count: number;
}

export interface WeekAccuracy {
  week: string;
  label: string;
  flashcard: number | null;
  quiz: number | null;
}

export interface ProgressDashboard {
  learning_hours: {
    total_minutes: number;
    total_hours: number;
    per_topic: TopicTime[];
  };
  completed_topics: {
    completed: number;
    total: number;
    percentage: number;
  };
  accuracy: {
    flashcard: number;
    quiz: number;
    overall: number;
  };
  streak: {
    current: number;
    longest: number;
  };
  knowledge_score: number;
  activity_heatmap: DailyActivity[];
  accuracy_trend: WeekAccuracy[];
  flashcards: {
    total: number;
    reviewed: number;
    accuracy: number;
  };
  quizzes: {
    total: number;
    accuracy: number;
  };
}

export async function fetchProgressDashboard(
  workspaceId: string,
): Promise<ProgressDashboard> {
  return apiFetch<ProgressDashboard>(
    `/ai/progress/dashboard?workspace_id=${workspaceId}`,
  );
}

export async function fetchWeeklyReport(
  workspaceId: string,
): Promise<{ report: string }> {
  return apiFetch<{ report: string }>(
    `/ai/progress/report?workspace_id=${workspaceId}`,
  );
}
