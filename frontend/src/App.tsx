import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { MainPanel } from './components/layout/MainPanel';
import { URLInputModal } from './components/modals/URLInputModal';
import { AuthModal } from './components/auth/AuthModal';
import { HeroSection } from './components/landing/HeroSection';
import { HowItWorksSection } from './components/landing/HowItWorksSection';
import { useVideoStore } from './store/useVideoStore';
import { useAuthStore } from './store/useAuthStore';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { useChatSessionStore } from './store/useChatSessionStore';
import { useAppStore } from './store/useAppStore';
import { fetchSavedVideos, fetchSavedVideoDetail, setAuthToken } from './api/client';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const isAddVideoModalOpen = useVideoStore((s) => s.isAddVideoModalOpen);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const token = useAuthStore((s) => s.token);
  const authModalMode = useAuthStore((s) => s.authModalMode);
  const setAuthModalMode = useAuthStore((s) => s.setAuthModalMode);
  const addVideo = useVideoStore((s) => s.addVideo);
  const addMessage = useVideoStore((s) => s.addMessage);
  const clearVideos = useVideoStore((s) => s.clearVideos);
  const renameVideo = useVideoStore((s) => s.renameVideo);
  const setPinned = useVideoStore((s) => s.setPinned);
  const setSavedVideoId = useVideoStore((s) => s.setSavedVideoId);

  const prevAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Resolve auth on mount + set up auth state listener
  useEffect(() => {
    useAuthStore.getState().resolveAuthOnMount();
    const unsubscribe = useAuthStore.getState().initAuthListener();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Clear videos only on actual logout (transition true→false), never on initial mount
    if (prevAuthRef.current && !isAuthenticated) {
      clearVideos();
      prevAuthRef.current = false;
      return;
    }
    prevAuthRef.current = isAuthenticated;

    if (!isAuthenticated) return;

    let cancelled = false;

    (async () => {
      try {
        const savedVideos = await fetchSavedVideos();
        const details = await Promise.all(
          savedVideos.map((v) => fetchSavedVideoDetail(v.id))
        );

        if (cancelled) return;

        // Use current store state to check existing videos (avoids stale closure)
        const currentVideos = useVideoStore.getState().videos;

        for (const detail of details) {
          const videoId = detail.youtube_video_id;

          // Only add if not already restored from localStorage
          if (currentVideos[videoId]) {
            // Sync server data into existing local entry
            setSavedVideoId(videoId, detail.id);
            if (detail.custom_name) {
              renameVideo(videoId, detail.custom_name);
            }
            if (detail.is_pinned) {
              setPinned(videoId, true);
            }
            continue;
          }

          addVideo({
            videoId,
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

          setSavedVideoId(videoId, detail.id);
          if (detail.custom_name) {
            renameVideo(videoId, detail.custom_name);
          }
          if (detail.is_pinned) {
            setPinned(videoId, true);
          }

          for (const msg of detail.messages) {
            addMessage(videoId, {
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: msg.timestamp,
            });
          }
        }
      } catch (err) {
        console.error('Failed to restore saved videos:', err);
        const apiErr = err as Error & { status?: number };
        if (apiErr.status === 401) {
          useAuthStore.getState().clearAuth();
          useWorkspaceStore.getState().resetState();
          useChatSessionStore.getState().resetState();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen bg-slate-900 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-indigo-400 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && showLanding) {
    return (
      <>
        <HeroSection
          onStartLearning={() => {
            useAppStore.getState().setAppMode('standalone');
            setShowLanding(false);
          }}
          onSignIn={() => setAuthModalMode('login')}
        />
        <HowItWorksSection
          onStartLearning={() => {
            useAppStore.getState().setAppMode('standalone');
            setShowLanding(false);
          }}
        />
        {authModalMode && <AuthModal onClose={() => setAuthModalMode(null)} initialTab={authModalMode} />}
      </>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <MainPanel />
      {isAddVideoModalOpen && <URLInputModal />}
      {authModalMode && <AuthModal onClose={() => setAuthModalMode(null)} initialTab={authModalMode} />}
    </div>
  );
}
