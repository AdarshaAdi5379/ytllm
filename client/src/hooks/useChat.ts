import { useCallback } from 'react';
import { useVideoStore } from '../store/useVideoStore';
import type { Message } from '../../../shared/types';

export function useChat(videoId: string | null) {
  const { addMessage, appendStreamingToken, finaliseStreamingMessage, setStreaming } = useVideoStore();

  const sendMessage = useCallback(
    async (question: string, chatHistory: Message[], systemPrompt: string) => {
      if (!videoId) return;

      // Add user message immediately
      const userMessage: Message = {
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
      };
      addMessage(videoId, userMessage);
      setStreaming(videoId, true);

      try {
        const response = await fetch('/api/chat/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: videoId,
            question,
            chat_history: chatHistory,
            system_prompt: systemPrompt,
          }),
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
    [videoId, addMessage, appendStreamingToken, finaliseStreamingMessage, setStreaming]
  );

  return { sendMessage };
}
