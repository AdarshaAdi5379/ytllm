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
