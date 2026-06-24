import { apiFetch } from './client';

export interface FlashcardItem {
  id: string;
  workspace_id: string;
  source_id: string | null;
  question: string;
  answer: string;
  difficulty: string;
  tags: string;
  easiness_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string | null;
  last_reviewed_at: string | null;
  total_reviews: number;
  correct_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewQueueItem {
  id: string;
  workspace_id: string;
  source_id: string | null;
  question: string;
  answer: string;
  difficulty: string;
  tags: string;
  easiness_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string | null;
  last_reviewed_at: string | null;
  total_reviews: number;
  correct_reviews: number;
}

export interface FlashcardStats {
  total: number;
  due_today: number;
  reviewed_today: number;
  retention_rate: number;
}

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = typeof DIFFICULTIES[number];

export async function fetchFlashcards(
  workspaceId: string,
  sourceId?: string,
  difficulty?: string,
): Promise<FlashcardItem[]> {
  const params = new URLSearchParams({ workspace_id: workspaceId });
  if (sourceId) params.set('source_id', sourceId);
  if (difficulty) params.set('difficulty', difficulty);
  return apiFetch<FlashcardItem[]>(`/ai/flashcards/?${params}`);
}

export async function createFlashcard(
  workspaceId: string,
  question: string,
  answer: string,
  difficulty?: string,
  sourceId?: string,
): Promise<FlashcardItem> {
  return apiFetch<FlashcardItem>('/ai/flashcards/', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      source_id: sourceId ?? null,
      question,
      answer,
      difficulty: difficulty ?? 'medium',
      tags: [],
    }),
  });
}

export async function generateFlashcards(
  sourceId: string,
  count: number = 10,
): Promise<FlashcardItem[]> {
  return apiFetch<FlashcardItem[]>('/ai/flashcards/generate', {
    method: 'POST',
    body: JSON.stringify({ source_id: sourceId, count }),
  });
}

export async function getFlashcard(id: string): Promise<FlashcardItem> {
  return apiFetch<FlashcardItem>(`/ai/flashcards/${id}`);
}

export async function updateFlashcard(
  id: string,
  data: { question?: string; answer?: string; difficulty?: string },
): Promise<FlashcardItem> {
  return apiFetch<FlashcardItem>(`/ai/flashcards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteFlashcard(id: string): Promise<void> {
  await apiFetch(`/ai/flashcards/${id}`, { method: 'DELETE' });
}

export async function reviewFlashcard(
  id: string,
  rating: number,
): Promise<FlashcardItem> {
  return apiFetch<FlashcardItem>(`/ai/flashcards/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ rating }),
  });
}

export async function fetchReviewQueue(
  workspaceId: string,
): Promise<ReviewQueueItem[]> {
  return apiFetch<ReviewQueueItem[]>(
    `/ai/flashcards/review-queue?workspace_id=${workspaceId}`,
  );
}

export async function fetchUpcomingReviews(
  workspaceId: string,
  days: number = 7,
): Promise<ReviewQueueItem[]> {
  return apiFetch<ReviewQueueItem[]>(
    `/ai/flashcards/upcoming?workspace_id=${workspaceId}&days=${days}`,
  );
}

export async function fetchFlashcardStats(
  workspaceId: string,
): Promise<FlashcardStats> {
  return apiFetch<FlashcardStats>(
    `/ai/flashcards/stats?workspace_id=${workspaceId}`,
  );
}
