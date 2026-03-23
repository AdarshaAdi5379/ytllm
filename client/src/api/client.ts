import type { TranscriptResponse, ExportRequest } from '../../../shared/types';

const API_BASE = '/api';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    let errorData: { error: string; message: string };
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'UNKNOWN_ERROR', message: `HTTP ${response.status}` };
    }
    const err = new Error(errorData.message);
    (err as Error & { code?: string }).code = errorData.error;
    throw err;
  }

  return response.json() as Promise<T>;
}

export async function fetchTranscript(url: string): Promise<TranscriptResponse & { systemPrompt: string }> {
  return apiFetch('/transcript', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export async function checkHealth(): Promise<{ status: string }> {
  return apiFetch('/health');
}

export async function exportChat(data: ExportRequest): Promise<Blob> {
  const response = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorData: { error: string; message: string };
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'EXPORT_FAILED', message: 'Export failed' };
    }
    throw new Error(errorData.message);
  }

  return response.blob();
}
