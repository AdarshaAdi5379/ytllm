import { apiFetch } from './client';

export interface LearningPathTopicItem {
  id: string;
  learning_path_id: string;
  title: string;
  description: string;
  sort_order: number;
  source_ids: string;
  completed: number;
  completed_at: string | null;
  time_spent_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface LearningPathItem {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  total_topics: number;
  completed_topics: number;
  time_spent_minutes: number;
  status: string;
  topics: LearningPathTopicItem[];
  created_at: string;
  updated_at: string;
}

export async function fetchLearningPaths(
  workspaceId: string,
  status?: string,
): Promise<LearningPathItem[]> {
  const params = new URLSearchParams({ workspace_id: workspaceId });
  if (status) params.set('status', status);
  return apiFetch<LearningPathItem[]>(`/ai/learning-path/?${params}`);
}

export async function getLearningPath(pathId: string): Promise<LearningPathItem> {
  return apiFetch<LearningPathItem>(`/ai/learning-path/${pathId}`);
}

export async function generateLearningPath(
  workspaceId: string,
  title?: string,
  focusArea?: string,
): Promise<LearningPathItem> {
  return apiFetch<LearningPathItem>('/ai/learning-path/generate', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      title: title ?? '',
      focus_area: focusArea ?? '',
    }),
  });
}

export async function updateLearningPath(
  pathId: string,
  data: { title?: string; description?: string; status?: string },
): Promise<LearningPathItem> {
  return apiFetch<LearningPathItem>(`/ai/learning-path/${pathId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteLearningPath(pathId: string): Promise<void> {
  await apiFetch(`/ai/learning-path/${pathId}`, { method: 'DELETE' });
}

export async function updateLearningPathTopic(
  pathId: string,
  topicId: string,
  data: { completed?: number; time_spent_minutes?: number },
): Promise<LearningPathTopicItem> {
  return apiFetch<LearningPathTopicItem>(`/ai/learning-path/${pathId}/topics/${topicId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
