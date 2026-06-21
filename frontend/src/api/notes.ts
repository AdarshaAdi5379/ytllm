import { apiFetch } from './client';

export interface NoteItem {
  id: string;
  workspace_id: string;
  source_id: string | null;
  content: string;
  tags: string;
  topic: string;
  difficulty: string;
  importance: number;
  created_at: string;
  updated_at: string;
}

export async function fetchNotes(
  workspaceId: string,
  sourceId?: string,
  topic?: string,
  difficulty?: string,
): Promise<NoteItem[]> {
  const params = new URLSearchParams({ workspace_id: workspaceId });
  if (sourceId) params.set('source_id', sourceId);
  if (topic) params.set('topic', topic);
  if (difficulty) params.set('difficulty', difficulty);
  return apiFetch<NoteItem[]>(`/ai/notes/?${params.toString()}`);
}

export async function createNote(
  workspaceId: string,
  content: string,
  sourceId?: string,
  tags?: string[],
  topic?: string,
  difficulty?: string,
  importance?: number,
): Promise<NoteItem> {
  return apiFetch<NoteItem>('/ai/notes/', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      source_id: sourceId || null,
      content,
      tags: tags || [],
      topic: topic || '',
      difficulty: difficulty || 'intermediate',
      importance: importance ?? 3,
    }),
  });
}

export async function getNote(noteId: string): Promise<NoteItem> {
  return apiFetch<NoteItem>(`/ai/notes/${noteId}`);
}

export async function updateNote(
  noteId: string,
  data: {
    content?: string;
    tags?: string[];
    topic?: string;
    difficulty?: string;
    importance?: number;
  },
): Promise<NoteItem> {
  return apiFetch<NoteItem>(`/ai/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteNote(noteId: string): Promise<void> {
  await apiFetch(`/ai/notes/${noteId}`, { method: 'DELETE' });
}
