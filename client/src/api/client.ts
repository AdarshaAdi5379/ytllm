import type { TranscriptResponse, ExportRequest } from '../../../shared/types';

const API_BASE = '/api';

type FastApiError = {
  error?: string;
  message?: string;
  detail?: { error?: string; message?: string } | string;
};

interface TranscriptResponseApi {
  video_id: string;
  title: string;
  channel_name: string;
  duration: string;
  thumbnail_url: string;
  transcript: string;
  summary: string;
  suggested_questions: string[];
  chunk_count: number;
  system_prompt: string;
}

function parseApiError(errorData: FastApiError, status: number): { code: string; message: string } {
  if (typeof errorData?.detail === 'string') {
    return {
      code: errorData.error ?? 'UNKNOWN_ERROR',
      message: errorData.detail,
    };
  }

  if (errorData?.detail && typeof errorData.detail === 'object') {
    return {
      code: errorData.detail.error ?? errorData.error ?? 'UNKNOWN_ERROR',
      message: errorData.detail.message ?? errorData.message ?? `HTTP ${status}`,
    };
  }

  return {
    code: errorData?.error ?? 'UNKNOWN_ERROR',
    message: errorData?.message ?? `HTTP ${status}`,
  };
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    let errorData: FastApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'UNKNOWN_ERROR', message: `HTTP ${response.status}` };
    }
    const normalized = parseApiError(errorData, response.status);
    const err = new Error(normalized.message);
    (err as Error & { code?: string }).code = normalized.code;
    throw err;
  }

  return response.json() as Promise<T>;
}

export async function fetchTranscript(url: string): Promise<TranscriptResponse & { systemPrompt: string }> {
  const data = await apiFetch<TranscriptResponseApi>('/transcript/', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });

  return {
    videoId: data.video_id,
    title: data.title,
    channelName: data.channel_name,
    duration: data.duration,
    thumbnailUrl: data.thumbnail_url,
    transcript: data.transcript,
    summary: data.summary,
    suggestedQuestions: data.suggested_questions,
    chunkCount: data.chunk_count,
    systemPrompt: data.system_prompt,
  };
}

export async function checkHealth(): Promise<{ status: string }> {
  return apiFetch('/health/');
}

export async function exportChat(data: ExportRequest): Promise<Blob> {
  const response = await fetch(`${API_BASE}/export/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_id: data.videoId,
      format: data.format,
      include_transcript: data.includeTranscript,
      chat_history: data.chatHistory,
    }),
  });

  if (!response.ok) {
    let errorData: FastApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'EXPORT_FAILED', message: 'Export failed' };
    }
    const normalized = parseApiError(errorData, response.status);
    throw new Error(normalized.message);
  }

  return response.blob();
}
