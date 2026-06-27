import { apiFetch, getAuthToken } from './client';

// --- Types ---

export interface StandaloneSessionItem {
  id: string;
  title: string;
  model: string | null;
  temperature: number | null;
  message_count: number;
  source_count: number;
  created_at: string;
  updated_at: string;
}

export interface StandaloneSourceItem {
  id: string;
  session_id: string;
  source_type: string;
  title: string;
  metadata_json: string;
  file_name: string | null;
  created_at: string;
}

export interface StandaloneChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations: string;
  timestamp: string;
}

export interface StandaloneSessionDetail {
  session: StandaloneSessionItem;
  messages: StandaloneChatMessage[];
  sources: StandaloneSourceItem[];
}

// --- Guest Token ---

const GUEST_TOKEN_KEY = 'standalone-guest-token';

export function getGuestToken(): string {
  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authToken = getAuthToken();
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const guestToken = getGuestToken();
  if (guestToken) headers['X-Guest-Token'] = guestToken;
  return { ...headers, ...extra };
}

async function apiFetchWithGuest<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = buildHeaders(options?.headers as Record<string, string> | undefined);
  const response = await fetch(`/api${url}`, { ...options, headers });

  if (!response.ok) {
    let errorData: any;
    try { errorData = await response.json(); } catch { errorData = { message: `HTTP ${response.status}` }; }
    const detail = errorData?.detail || errorData;
    const err = new Error(detail.message || detail.error || 'Request failed') as Error & { code?: string; status?: number };
    err.code = detail.error || 'UNKNOWN_ERROR';
    err.status = response.status;
    throw err;
  }
  return response.json();
}

// --- Session CRUD ---

export async function createStandaloneSession(title?: string): Promise<StandaloneSessionItem> {
  return apiFetchWithGuest<StandaloneSessionItem>('/standalone/sessions', {
    method: 'POST',
    body: JSON.stringify({ title: title || 'New Chat', guest_token: getGuestToken() }),
  });
}

export async function fetchStandaloneSessions(): Promise<StandaloneSessionItem[]> {
  return apiFetchWithGuest<StandaloneSessionItem[]>('/standalone/sessions');
}

export async function getStandaloneSession(id: string): Promise<StandaloneSessionDetail> {
  return apiFetchWithGuest<StandaloneSessionDetail>(`/standalone/sessions/${id}`);
}

export async function renameStandaloneSession(id: string, title: string): Promise<StandaloneSessionItem> {
  return apiFetchWithGuest<StandaloneSessionItem>(`/standalone/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function deleteStandaloneSession(id: string): Promise<void> {
  await apiFetchWithGuest(`/standalone/sessions/${id}`, { method: 'DELETE' });
}

// --- Sources ---

export async function uploadStandaloneText(
  sessionId: string,
  title: string,
  content: string,
): Promise<StandaloneSourceItem> {
  const formData = new FormData();
  formData.append('source_type', 'text');
  formData.append('title', title);
  formData.append('content', content);

  const headers: Record<string, string> = {};
  const authToken = getAuthToken();
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const guestToken = getGuestToken();
  if (guestToken) headers['X-Guest-Token'] = guestToken;

  const response = await fetch(`/api/standalone/sessions/${sessionId}/sources`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorData: any;
    try { errorData = await response.json(); } catch { errorData = { message: `HTTP ${response.status}` }; }
    const detail = errorData?.detail || errorData;
    const err = new Error(detail.message || detail.error || 'Upload failed');
    (err as any).code = detail.error || 'UPLOAD_FAILED';
    throw err;
  }

  return response.json();
}

export async function uploadStandaloneUrl(sessionId: string, url: string): Promise<StandaloneSourceItem> {
  const formData = new FormData();
  formData.append('source_type', 'url');
  formData.append('url', url);
  formData.append('title', '');

  const headers: Record<string, string> = {};
  const authToken = getAuthToken();
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const guestToken = getGuestToken();
  if (guestToken) headers['X-Guest-Token'] = guestToken;

  const response = await fetch(`/api/standalone/sessions/${sessionId}/sources`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorData: any;
    try { errorData = await response.json(); } catch { errorData = { message: `HTTP ${response.status}` }; }
    const detail = errorData?.detail || errorData;
    const err = new Error(detail.message || detail.error || 'Upload failed');
    (err as any).code = detail.error || 'UPLOAD_FAILED';
    throw err;
  }

  return response.json();
}

export async function uploadStandaloneFile(
  sessionId: string,
  file: File,
  title?: string,
): Promise<StandaloneSourceItem> {
  const formData = new FormData();
  formData.append('source_type', 'file');
  formData.append('file', file);
  formData.append('title', title || '');

  const headers: Record<string, string> = {};
  const authToken = getAuthToken();
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const guestToken = getGuestToken();
  if (guestToken) headers['X-Guest-Token'] = guestToken;

  const response = await fetch(`/api/standalone/sessions/${sessionId}/sources`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorData: any;
    try { errorData = await response.json(); } catch { errorData = { message: `HTTP ${response.status}` }; }
    const detail = errorData?.detail || errorData;
    const err = new Error(detail.message || detail.error || 'Upload failed');
    (err as any).code = detail.error || 'UPLOAD_FAILED';
    throw err;
  }

  return response.json();
}

export async function fetchStandaloneSources(sessionId: string): Promise<StandaloneSourceItem[]> {
  return apiFetchWithGuest<StandaloneSourceItem[]>(`/standalone/sessions/${sessionId}/sources`);
}

export async function deleteStandaloneSource(sessionId: string, sourceId: string): Promise<void> {
  await apiFetchWithGuest(`/standalone/sessions/${sessionId}/sources/${sourceId}`, { method: 'DELETE' });
}

// --- Chat ---

export interface StandaloneChatRequest {
  question: string;
  chat_history: { role: string; content: string; timestamp: string }[];
  model?: string;
  temperature?: number;
}

export function streamStandaloneChat(
  sessionId: string,
  req: StandaloneChatRequest,
  callbacks: {
    onToken: (text: string) => void;
    onMeta?: (meta: any) => void;
    onCitations?: (citations: any[]) => void;
    onError: (msg: string) => void;
    onDone: () => void;
  },
): AbortController {
  const controller = new AbortController();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authToken = getAuthToken();
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const guestToken = getGuestToken();
  if (guestToken) headers['X-Guest-Token'] = guestToken;

  fetch(`/api/standalone/sessions/${sessionId}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        callbacks.onError(err.message || 'Chat failed');
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
                callbacks.onMeta?.(event);
                break;
              case 'token':
                callbacks.onToken(event.content || '');
                break;
              case 'citations':
                callbacks.onCitations?.(event.citations || []);
                break;
              case 'error':
                callbacks.onError(event.message || 'Unknown error');
                break;
            }
          } catch { /* skip malformed */ }
        }
      }
      callbacks.onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err.message || 'Connection failed');
      }
    });

  return controller;
}

// --- Move to Workspace ---

export async function moveSessionToWorkspace(
  sessionId: string,
  workspaceId: string,
  folderId?: string,
): Promise<{ workspace_id: string; session_id: string }> {
  return apiFetchWithGuest(`/standalone/sessions/${sessionId}/move`, {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId, folder_id: folderId ?? null }),
  });
}

// --- Guest ---

export async function claimGuestSessions(token: string): Promise<{ claimed: number }> {
  return apiFetch(`/standalone/claim`, {
    method: 'POST',
    body: JSON.stringify({ guest_token: token }),
  });
}
