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

export type TopicMasteryStatus = 'weak' | 'learning' | 'strong' | 'mastered';

export interface TopicMasteryItem {
  topic_id: string;
  topic_name: string;
  description: string;
  mastery_score: number;
  status: TopicMasteryStatus;
  total_attempts: number;
  correct_attempts: number;
  accuracy_percentage: number;
  revision_priority: number;
  last_practiced_at: string | null;
  next_recommended_action: string;
}

export interface TopicPerformanceLogItem {
  id: string;
  item_type: 'flashcard' | 'quiz';
  is_correct: boolean;
  score: number;
  created_at: string;
}

export interface TopicDetailResponse {
  topic: TopicMasteryItem;
  related_flashcards: Array<{
    id: string;
    question: string;
    answer: string;
    difficulty: string;
    total_reviews: number;
    correct_reviews: number;
  }>;
  related_quizzes: Array<{
    id: string;
    title: string;
    quiz_type: string;
    score: number | null;
    max_score: number | null;
    completed_at: string | null;
  }>;
  recent_performance: TopicPerformanceLogItem[];
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
  topic_mastery?: TopicMasteryItem[];
  focus_areas?: TopicMasteryItem[];
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

export async function fetchTopicMasteries(
  workspaceId: string,
): Promise<TopicMasteryItem[]> {
  return apiFetch<TopicMasteryItem[]>(
    `/ai/progress/topics?workspace_id=${workspaceId}`,
  );
}

export async function fetchTopicDetails(
  topicId: string,
): Promise<TopicDetailResponse> {
  return apiFetch<TopicDetailResponse>(
    `/ai/progress/topics/${topicId}/details`,
  );
}
