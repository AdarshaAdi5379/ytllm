import { useCallback } from 'react';
import { useVideoStore } from '../store/useVideoStore';
import type { Message } from '../../../shared/types';

export function useChat(videoId: string | null) {
  const videos = useVideoStore((s) => s.videos);
  const { addMessage, appendStreamingToken, finaliseStreamingMessage, setStreaming } = useVideoStore();

  const sendMessage = useCallback(
    async (question: string, chatHistory: Message[], systemPrompt: string) => {
      if (!videoId) return;

      const parsed = parseChatCommand(question, Object.keys(videos));
      const displayQuestion = parsed.displayQuestion;

      // Add user message immediately
      const userMessage: Message = {
        role: 'user',
        content: displayQuestion,
        timestamp: new Date().toISOString(),
      };
      addMessage(videoId, userMessage);
      setStreaming(videoId, true);

      try {
        const endpoint = parsed.mode === 'multi' ? '/api/chat/multi/' : '/api/chat/';
        const body =
          parsed.mode === 'multi'
            ? {
                video_ids: parsed.videoIds,
                question: parsed.cleanedQuestion,
                chat_history: chatHistory,
                // Let the backend build a multi-video prompt
                system_prompt: '',
                filters: parsed.filters,
              }
            : {
                video_id: videoId,
                question: parsed.cleanedQuestion,
                chat_history: chatHistory,
                system_prompt: systemPrompt,
                filters: parsed.filters,
              };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          try {
            const errorData = await response.json();
            const detail = errorData?.detail;
            if (detail?.message) {
              throw new Error(detail.message);
            }
            throw new Error(errorData?.message || 'Failed to connect to chat API');
          } catch {
            throw new Error('Failed to connect to chat API');
          }
        }

        if (!response.body) {
          throw new Error('Failed to read chat stream');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (!data) continue;

              try {
                const event = JSON.parse(data);
                if (event.type === 'token') {
                  appendStreamingToken(videoId, event.content);
                } else if (event.type === 'done') {
                  finaliseStreamingMessage(videoId);
                } else if (event.type === 'error') {
                  throw new Error(event.message);
                }
              } catch (parseErr) {
                // Skip malformed SSE data
              }
            }
          }
        }
      } catch (err) {
        console.error('Chat error:', err);
        appendStreamingToken(videoId, '\n\n*Error: Failed to generate response. Please try again.*');
        finaliseStreamingMessage(videoId);
      }
    },
    [videoId, videos, addMessage, appendStreamingToken, finaliseStreamingMessage, setStreaming]
  );

  return { sendMessage };
}

type ChatMode = 'single' | 'multi';

function parseChatCommand(input: string, availableVideoIds: string[]) {
  let raw = input.trim();
  let mode: ChatMode = 'single';
  let videoIds: string[] = [];
  const filters: { time_range_s?: [number, number] } = {};
  const tags: string[] = [];

  // /multi [all|id1,id2,...]
  if (raw.toLowerCase().startsWith('/multi')) {
    mode = 'multi';
    const rest = raw.slice('/multi'.length).trim();
    tags.push('[Multi]');

    if (!rest || rest.toLowerCase() === 'all') {
      videoIds = availableVideoIds;
      raw = '';
    } else if (rest.toLowerCase().startsWith('all ')) {
      videoIds = availableVideoIds;
      raw = rest.slice(4).trim();
    } else {
      const parts = rest.split(/\s+/);
      const firstToken = parts[0] ?? '';
      const remaining = parts.slice(1).join(' ').trim();

      const candidateIds = firstToken
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const looksLikeIds = candidateIds.length > 0 && candidateIds.every((id) => /^[a-zA-Z0-9_-]{6,}$/.test(id));

      if (looksLikeIds && remaining) {
        videoIds = candidateIds;
        raw = remaining;
      } else {
        videoIds = availableVideoIds;
        raw = rest;
      }
    }
  }

  // /time start-end <question>
  if (raw.toLowerCase().startsWith('/time')) {
    const rest = raw.slice('/time'.length).trim();
    const m = rest.match(/^([^\s]+)\s+(.*)$/);
    if (m) {
      const range = m[1];
      const q = m[2];
      const parts = range.split('-').map((s) => s.trim());
      if (parts.length === 2) {
        const start = parseTimeToSeconds(parts[0]);
        const end = parseTimeToSeconds(parts[1]);
        if (start != null && end != null && end >= start) {
          filters.time_range_s = [start, end];
          tags.push(`[Time ${formatSeconds(start)}-${formatSeconds(end)}]`);
          raw = q.trim();
        }
      }
    }
  }

  const cleanedQuestion = raw.trim();
  const displayQuestion = `${tags.join(' ')}${tags.length ? ' ' : ''}${cleanedQuestion || input.trim()}`.trim();

  return {
    mode,
    videoIds,
    cleanedQuestion: cleanedQuestion || input.trim(),
    displayQuestion,
    filters: Object.keys(filters).length ? filters : undefined,
  };
}

function parseTimeToSeconds(value: string): number | null {
  const v = value.trim();
  if (!v) return null;

  if (/^\d+(\.\d+)?$/.test(v)) {
    return Math.floor(Number(v));
  }

  const parts = v.split(':').map((p) => p.trim());
  if (parts.length === 2) {
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    if (Number.isFinite(m) && Number.isFinite(s)) return Math.floor(m * 60 + s);
  }
  if (parts.length === 3) {
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    const s = Number(parts[2]);
    if (Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(s)) return Math.floor(h * 3600 + m * 60 + s);
  }

  return null;
}

function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
