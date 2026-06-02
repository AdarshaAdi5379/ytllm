import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchTranscript, saveVideoToServer } from '../api/client';
import { useVideoStore } from '../store/useVideoStore';
import { useAuthStore } from '../store/useAuthStore';

export function useTranscript() {
  const addVideo = useVideoStore((s) => s.addVideo);
  const setSavedVideoId = useVideoStore((s) => s.setSavedVideoId);

  return useMutation({
    mutationFn: (url: string) => fetchTranscript(url),
    onSuccess: (data) => {
      addVideo({
        videoId: data.videoId,
        title: data.title,
        channelName: data.channelName,
        duration: data.duration,
        thumbnailUrl: data.thumbnailUrl,
        transcript: data.transcript,
        summary: data.summary,
        suggestedQuestions: data.suggestedQuestions,
        systemPrompt: data.systemPrompt,
        status: 'ready',
        errorMessage: null,
      });

      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        saveVideoToServer({
          youtube_video_id: data.videoId,
          title: data.title,
          channel_name: data.channelName,
          duration: data.duration,
          thumbnail_url: data.thumbnailUrl,
          transcript: data.transcript,
          summary: data.summary,
          system_prompt: data.systemPrompt,
        })
          .then((saved) => {
            setSavedVideoId(data.videoId, saved.id);
          })
          .catch((err) => {
            console.error('Failed to persist video to server:', err);
          });
      }

      toast.success('Video loaded successfully!');
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'NO_CAPTIONS') {
        toast.error('This video has no captions available.');
      } else if (err.code === 'INVALID_URL') {
        toast.error('Invalid YouTube URL. Please check and try again.');
      } else if (err.code === 'QUOTA_EXCEEDED') {
        toast.error('API quota reached. Please try again tomorrow.');
      } else {
        toast.error(err.message || 'Failed to load video. Please try again.');
      }
    },
  });
}