import { apiFetch, getAuthToken } from './client';

// --- Types (matching snake_case backend) ---

export interface WorkspaceItem {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FolderItem {
  id: string;
  workspace_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FolderTreeItem {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  children: FolderTreeItem[];
  source_count: number;
}

// --- Workspace API ---

export async function fetchWorkspaces(): Promise<WorkspaceItem[]> {
  return apiFetch<WorkspaceItem[]>('/workspace/');
}

export async function createWorkspace(name: string): Promise<WorkspaceItem> {
  return apiFetch<WorkspaceItem>('/workspace/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function getWorkspace(id: string): Promise<WorkspaceItem> {
  return apiFetch<WorkspaceItem>(`/workspace/${id}`);
}

export async function updateWorkspace(id: string, name: string): Promise<WorkspaceItem> {
  return apiFetch<WorkspaceItem>(`/workspace/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteWorkspace(id: string): Promise<void> {
  await apiFetch(`/workspace/${id}`, { method: 'DELETE' });
}

// --- Folder API ---

export async function fetchFolderTree(workspaceId: string): Promise<FolderTreeItem[]> {
  return apiFetch<FolderTreeItem[]>(`/workspace/${workspaceId}/folders/`);
}

export async function fetchFoldersFlat(workspaceId: string): Promise<FolderItem[]> {
  return apiFetch<FolderItem[]>(`/workspace/${workspaceId}/folders/flat`);
}

export async function createFolder(
  workspaceId: string,
  name: string,
  parentId?: string,
): Promise<FolderItem> {
  return apiFetch<FolderItem>(`/workspace/${workspaceId}/folders/`, {
    method: 'POST',
    body: JSON.stringify({ name, parent_id: parentId ?? null }),
  });
}

export async function getFolder(workspaceId: string, folderId: string): Promise<FolderItem> {
  return apiFetch<FolderItem>(`/workspace/${workspaceId}/folders/${folderId}`);
}

export async function updateFolder(
  workspaceId: string,
  folderId: string,
  data: { name?: string; sort_order?: number; parent_id?: string | null },
): Promise<FolderItem> {
  return apiFetch<FolderItem>(`/workspace/${workspaceId}/folders/${folderId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteFolder(workspaceId: string, folderId: string): Promise<void> {
  await apiFetch(`/workspace/${workspaceId}/folders/${folderId}`, { method: 'DELETE' });
}

// --- Source API ---

export interface SourceItem {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  source_type: string;
  title: string;
  metadata_json: string;
  raw_text: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchSources(workspaceId: string, folderId?: string): Promise<SourceItem[]> {
  const params = folderId ? `?folder_id=${folderId}` : '';
  return apiFetch<SourceItem[]>(`/workspace/${workspaceId}/sources/${params}`);
}

export async function getSource(workspaceId: string, sourceId: string): Promise<SourceItem> {
  return apiFetch<SourceItem>(`/workspace/${workspaceId}/sources/${sourceId}`);
}

export async function deleteSource(workspaceId: string, sourceId: string): Promise<void> {
  await apiFetch(`/workspace/${workspaceId}/sources/${sourceId}`, { method: 'DELETE' });
}

// --- Task API ---

export interface TaskStatus {
  id: string;
  type: string;
  name: string;
  status: 'queued' | 'processing' | 'done' | 'failed' | 'unknown';
  error: string | null;
  result: string | null;
  created_at: number;
  updated_at: number;
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  return apiFetch<TaskStatus>(`/tasks/${taskId}`);
}

export function pollImportTask(
  taskId: string,
  intervalMs = 2000,
): Promise<TaskStatus> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const task = await getTaskStatus(taskId);
        if (task.status === 'done') { resolve(task); return; }
        if (task.status === 'failed') { reject(new Error(task.error || 'Import failed')); return; }
        if (task.status === 'unknown') { reject(new Error('Task not found')); return; }
        setTimeout(poll, intervalMs);
      } catch (err) {
        reject(err);
      }
    };
    poll();
  });
}

export interface ImportTaskResult {
  task_id: string;
  status: string;
  source_type: string;
}

// --- Background import helpers ---

export async function importPdfSourceBackground(
  workspaceId: string,
  url: string,
  folderId?: string,
): Promise<ImportTaskResult> {
  return apiFetch<ImportTaskResult>('/sources/pdf/import?background=true', {
    method: 'POST',
    body: JSON.stringify({ url, workspace_id: workspaceId, folder_id: folderId ?? null }),
  });
}

export async function importWebsiteSourceBackground(
  workspaceId: string,
  url: string,
  folderId?: string,
): Promise<ImportTaskResult> {
  return apiFetch<ImportTaskResult>('/sources/website/import?background=true', {
    method: 'POST',
    body: JSON.stringify({ url, workspace_id: workspaceId, folder_id: folderId ?? null }),
  });
}

export async function importYouTubeSourceBackground(
  workspaceId: string,
  url: string,
  folderId?: string,
): Promise<ImportTaskResult> {
  return apiFetch<ImportTaskResult>('/sources/youtube/import?background=true', {
    method: 'POST',
    body: JSON.stringify({ url, workspace_id: workspaceId, folder_id: folderId ?? null }),
  });
}

export async function importMarkdownSourceBackground(
  workspaceId: string,
  content: string,
  title?: string,
  folderId?: string,
): Promise<ImportTaskResult> {
  return apiFetch<ImportTaskResult>('/sources/markdown/import?background=true', {
    method: 'POST',
    body: JSON.stringify({ content, title: title ?? '', workspace_id: workspaceId, folder_id: folderId ?? null }),
  });
}

export async function importTextSourceBackground(
  workspaceId: string,
  content: string,
  title?: string,
  folderId?: string,
): Promise<ImportTaskResult> {
  return apiFetch<ImportTaskResult>('/sources/text/import?background=true', {
    method: 'POST',
    body: JSON.stringify({ content, title: title ?? '', workspace_id: workspaceId, folder_id: folderId ?? null }),
  });
}

export async function uploadDocxSourceBackground(
  workspaceId: string,
  file: File,
  title?: string,
  folderId?: string,
): Promise<ImportTaskResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspaceId);
  formData.append('title', title ?? '');
  formData.append('folder_id', folderId ?? '');

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/sources/docx/import?background=true', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorData: any;
    try { errorData = await response.json(); } catch { errorData = { message: `HTTP ${response.status}` }; }
    const detail = errorData?.detail || errorData;
    const err = new Error(detail.message || detail.error || 'Import failed');
    (err as any).code = detail.error || 'IMPORT_FAILED';
    throw err;
  }

  return response.json();
}

export async function uploadPptxSourceBackground(
  workspaceId: string,
  file: File,
  title?: string,
  folderId?: string,
): Promise<ImportTaskResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspaceId);
  formData.append('title', title ?? '');
  formData.append('folder_id', folderId ?? '');

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/sources/pptx/import?background=true', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorData: any;
    try { errorData = await response.json(); } catch { errorData = { message: `HTTP ${response.status}` }; }
    const detail = errorData?.detail || errorData;
    const err = new Error(detail.message || detail.error || 'Import failed');
    (err as any).code = detail.error || 'IMPORT_FAILED';
    throw err;
  }

  return response.json();
}

export async function importGitHubSourceBackground(
  workspaceId: string,
  url: string,
  folderId?: string,
): Promise<ImportTaskResult> {
  return apiFetch<ImportTaskResult>('/sources/github/import?background=true', {
    method: 'POST',
    body: JSON.stringify({ url, workspace_id: workspaceId, folder_id: folderId ?? null }),
  });
}

export async function importPdfSource(
  workspaceId: string,
  url: string,
  folderId?: string,
): Promise<SourceItem> {
  return apiFetch<SourceItem>('/sources/pdf/import', {
    method: 'POST',
    body: JSON.stringify({
      url,
      workspace_id: workspaceId,
      folder_id: folderId ?? null,
    }),
  });
}

export async function importWebsiteSource(
  workspaceId: string,
  url: string,
  folderId?: string,
): Promise<SourceItem> {
  return apiFetch<SourceItem>('/sources/website/import', {
    method: 'POST',
    body: JSON.stringify({
      url,
      workspace_id: workspaceId,
      folder_id: folderId ?? null,
    }),
  });
}

export async function importTextSource(
  workspaceId: string,
  content: string,
  title?: string,
  folderId?: string,
): Promise<SourceItem> {
  return apiFetch<SourceItem>('/sources/text/import', {
    method: 'POST',
    body: JSON.stringify({
      content,
      title: title ?? '',
      workspace_id: workspaceId,
      folder_id: folderId ?? null,
    }),
  });
}

export async function uploadPptxSource(
  workspaceId: string,
  file: File,
  title?: string,
  folderId?: string,
): Promise<SourceItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspaceId);
  formData.append('title', title ?? '');
  formData.append('folder_id', folderId ?? '');

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/sources/pptx/import', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorData: any;
    try { errorData = await response.json(); } catch { errorData = { message: `HTTP ${response.status}` }; }
    const detail = errorData?.detail || errorData;
    const err = new Error(detail.message || detail.error || 'Import failed');
    (err as any).code = detail.error || 'IMPORT_FAILED';
    throw err;
  }

  return response.json();
}

export async function uploadDocxSource(
  workspaceId: string,
  file: File,
  title?: string,
  folderId?: string,
): Promise<SourceItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspaceId);
  formData.append('title', title ?? '');
  formData.append('folder_id', folderId ?? '');

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/sources/docx/import', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorData: any;
    try { errorData = await response.json(); } catch { errorData = { message: `HTTP ${response.status}` }; }
    const detail = errorData?.detail || errorData;
    const err = new Error(detail.message || detail.error || 'Import failed');
    (err as any).code = detail.error || 'IMPORT_FAILED';
    throw err;
  }

  return response.json();
}

export async function importMarkdownSource(
  workspaceId: string,
  content: string,
  title?: string,
  folderId?: string,
): Promise<SourceItem> {
  return apiFetch<SourceItem>('/sources/markdown/import', {
    method: 'POST',
    body: JSON.stringify({
      content,
      title: title ?? '',
      workspace_id: workspaceId,
      folder_id: folderId ?? null,
    }),
  });
}

export async function importYouTubeSource(
  workspaceId: string,
  url: string,
  folderId?: string,
): Promise<SourceItem> {
  return apiFetch<SourceItem>('/sources/youtube/import', {
    method: 'POST',
    body: JSON.stringify({
      url,
      workspace_id: workspaceId,
      folder_id: folderId ?? null,
    }),
  });
}

// --- Chat Session API ---

export interface ChatSessionItem {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  title: string;
  source_ids: string;
  model: string | null;
  temperature: number | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface SessionDetail {
  session: ChatSessionItem;
  messages: { role: string; content: string; timestamp: string }[];
}

export async function fetchSessions(workspaceId: string): Promise<ChatSessionItem[]> {
  return apiFetch<ChatSessionItem[]>(`/workspace/${workspaceId}/sessions/`);
}

export async function createSession(
  workspaceId: string,
  title?: string,
  sourceIds?: string[],
  model?: string,
  temperature?: number,
): Promise<ChatSessionItem> {
  return apiFetch<ChatSessionItem>(`/workspace/${workspaceId}/sessions/`, {
    method: 'POST',
    body: JSON.stringify({ title: title ?? 'New Chat', source_ids: sourceIds ?? [], model, temperature }),
  });
}

export async function getSession(workspaceId: string, sessionId: string): Promise<SessionDetail> {
  return apiFetch<SessionDetail>(`/workspace/${workspaceId}/sessions/${sessionId}`);
}

export async function updateSession(
  workspaceId: string,
  sessionId: string,
  data: { title?: string },
): Promise<ChatSessionItem> {
  return apiFetch<ChatSessionItem>(`/workspace/${workspaceId}/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSession(workspaceId: string, sessionId: string): Promise<void> {
  await apiFetch(`/workspace/${workspaceId}/sessions/${sessionId}`, { method: 'DELETE' });
}

// --- Workspace Chat (SSE) ---

export interface WorkspaceChatRequest {
  session_id?: string;
  question: string;
  chat_history: { role: string; content: string; timestamp: string }[];
  source_ids?: string[];
  folder_id?: string;
  model?: string;
  temperature?: number;
}

export function streamWorkspaceChat(
  workspaceId: string,
  req: WorkspaceChatRequest,
  onToken: (token: string) => void,
  onMeta: (meta: any) => void,
  onError: (error: string) => void,
  onDone: () => void,
  onCitations?: (citations: any[]) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`/api/ai/chat/workspace/${workspaceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        onError(err.message || 'Chat failed');
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            switch (event.type) {
              case 'meta':
                onMeta(event);
                break;
              case 'token':
                onToken(event.content || '');
                break;
              case 'citations':
                onCitations?.(event.citations || []);
                break;
              case 'error':
                onError(event.message || 'Unknown error');
                break;
            }
          } catch { /* skip malformed */ }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Connection failed');
      }
    });

  return controller;
}

export interface SearchResultItem {
  text: string;
  source_id: string;
  source_title: string;
  source_type: string;
  chunk_index: number | null;
  start_s: number | null;
  end_s: number | null;
  distance: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
}

// --- Members API ---

export interface MemberItem {
  id: string;
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

export async function inviteMember(
  workspaceId: string,
  email: string,
  role: string,
): Promise<MemberItem> {
  return apiFetch<MemberItem>(`/workspace/${workspaceId}/members/`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function listMembers(workspaceId: string): Promise<MemberItem[]> {
  return apiFetch<MemberItem[]>(`/workspace/${workspaceId}/members/`);
}

export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  role: string,
): Promise<void> {
  await apiFetch(`/workspace/${workspaceId}/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(
  workspaceId: string,
  memberId: string,
): Promise<void> {
  await apiFetch(`/workspace/${workspaceId}/members/${memberId}`, { method: 'DELETE' });
}

// --- Summary API ---

export interface SummaryItem {
  id: string;
  source_id: string;
  type: string;
  content: string;
  created_at: string;
}

export const SUMMARY_TYPES = ['short', 'detailed', 'executive', 'eli5', 'interview', 'revision'] as const;
export type SummaryType = typeof SUMMARY_TYPES[number];

export const SUMMARY_TYPE_LABELS: Record<SummaryType, string> = {
  short: 'Short (TL;DR)',
  detailed: 'Detailed',
  executive: 'Executive',
  eli5: 'ELI5',
  interview: 'Interview Q&A',
  revision: 'Revision',
};

export async function listSummaries(sourceId: string): Promise<SummaryItem[]> {
  return apiFetch<SummaryItem[]>(`/ai/summary/${sourceId}`);
}

export async function generateSummary(
  sourceId: string,
  summaryType: SummaryType,
): Promise<SummaryItem> {
  return apiFetch<SummaryItem>(`/ai/summary/generate/${sourceId}?summary_type=${summaryType}`, {
    method: 'POST',
  });
}

export async function deleteSummary(sourceId: string, summaryType: string): Promise<void> {
  await apiFetch(`/ai/summary/${sourceId}/${summaryType}`, { method: 'DELETE' });
}

export async function searchWorkspace(
  workspaceId: string,
  query: string,
  folderId?: string,
  sourceType?: string,
): Promise<SearchResponse> {
  return apiFetch<SearchResponse>(`/ai/search/`, {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      query,
      folder_id: folderId || null,
      source_type: sourceType || null,
    }),
  });
}
