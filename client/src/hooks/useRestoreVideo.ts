import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchSavedVideoDetail } from '../api/client';
import { useVideoStore } from '../store/useVideoStore';
import { fetchTranscript } from '../api/client';
import { getYouTubeUrl } from '../utils/youtubeParser';

export function useRestoreVideo() {
  const [restoring, setRestoring] = useState<string | null>(null);
  const addVideo = useVideoStore((s) => s.addVideo);
  const addMessage = useVideoStore((s) => s.addMessage);

  const restore = useCallback(
    async (savedId: string) => {
      setRestoring(savedId);
      try {
        const detail = await fetchSavedVideoDetail(savedId);
        const url = getYouTubeUrl(detail.youtube_video_id);

        // Re-index via transcript endpoint
        const result = await fetchTranscript(url);

        // Add video to store
        addVideo({
          videoId: result.videoId,
          title: result.title,
          channelName: result.channelName,
          duration: result.duration,
          thumbnailUrl: result.thumbnailUrl,
          transcript: result.transcript,
          summary: result.summary,
          suggestedQuestions: result.suggestedQuestions,
          systemPrompt: result.systemPrompt,
          status: 'ready',
          errorMessage: null,
        });

        // Restore chat history
        for (const msg of detail.messages) {
          addMessage(result.videoId, {
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.timestamp,
          });
        }

        toast.success('Video restored successfully!');
      } catch (err) {
        toast.error((err as Error).message || 'Failed to restore video.');
      } finally {
        setRestoring(null);
      }
    },
    [addVideo, addMessage]
  );

  return { restore, restoring };
}
