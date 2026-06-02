import { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MainPanel } from './components/layout/MainPanel';
import { URLInputModal } from './components/modals/URLInputModal';
import { useVideoStore } from './store/useVideoStore';
import { useAuthStore } from './store/useAuthStore';
import { fetchSavedVideos, fetchSavedVideoDetail, setAuthToken } from './api/client';

export default function App() {
  const isAddVideoModalOpen = useVideoStore((s) => s.isAddVideoModalOpen);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const addVideo = useVideoStore((s) => s.addVideo);
  const addMessage = useVideoStore((s) => s.addMessage);
  const clearVideos = useVideoStore((s) => s.clearVideos);
  const renameVideo = useVideoStore((s) => s.renameVideo);
  const setPinned = useVideoStore((s) => s.setPinned);
  const setSavedVideoId = useVideoStore((s) => s.setSavedVideoId);

  // Make auth header wiring robust across refresh/rehydration timing.
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearVideos();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const savedVideos = await fetchSavedVideos();
        const details = await Promise.all(
          savedVideos.map((v) => fetchSavedVideoDetail(v.id))
        );

        if (cancelled) return;

        for (const detail of details) {
          addVideo({
            videoId: detail.youtube_video_id,
            title: detail.title,
            channelName: detail.channel_name,
            duration: detail.duration,
            thumbnailUrl: detail.thumbnail_url,
            transcript: detail.transcript,
            summary: detail.summary,
            suggestedQuestions: [],
            systemPrompt: detail.system_prompt,
            status: 'ready',
            errorMessage: null,
          });

          setSavedVideoId(detail.youtube_video_id, detail.id);
          if (detail.custom_name) {
            renameVideo(detail.youtube_video_id, detail.custom_name);
          }
          if (detail.is_pinned) {
            setPinned(detail.youtube_video_id, true);
          }

          for (const msg of detail.messages) {
            addMessage(detail.youtube_video_id, {
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: msg.timestamp,
            });
          }
        }
      } catch (err) {
        console.error('Failed to restore saved videos:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, addVideo, addMessage, clearVideos]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <MainPanel />
      {isAddVideoModalOpen && <URLInputModal />}
    </div>
  );
}
