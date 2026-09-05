import { useState, useEffect, useRef } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { MainPanel } from './components/layout/MainPanel';
import { URLInputModal } from './components/modals/URLInputModal';
import { AuthModal } from './components/auth/AuthModal';
import { FeedbackModal } from './components/modals/FeedbackModal';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { HeroSection } from './components/landing/HeroSection';
import { HowItWorksSection } from './components/landing/HowItWorksSection';
import { ComparisonSection } from './components/landing/ComparisonSection';
import { WorkspaceShowcaseSection } from './components/landing/WorkspaceShowcaseSection';
import { CTASection } from './components/landing/CTASection';
import { FooterSection } from './components/landing/FooterSection';
import { useVideoStore } from './store/useVideoStore';
import { useAuthStore } from './store/useAuthStore';
import { useAppStore } from './store/useAppStore';
import { fetchSavedVideos, fetchSavedVideoDetail, setAuthToken } from './api/client';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
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

  // Set up auth state listener FIRST, then resolve auth on mount.
  // The listener must be registered before resolveAuthOnMount completes
  // so that SIGNED_IN events from OAuth callbacks are not missed.
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initAuthListener();
    useAuthStore.getState().resolveAuthOnMount();
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

    // Don't fetch saved videos until auth restoration is fully complete.
    // During startup, isAuthenticated can become true from a SIGNED_IN/TOKEN_REFRESHED
    // listener event before resolveAuthOnMount finishes. Firing /videos/ at that
    // point uses a token that may not be validated yet, causing a transient 401.
    if (!isAuthenticated || isAuthLoading) return;

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
        // Don't call clearAuth() on a transient 401 during startup.
        // The global _onUnauthorized handler already attempts a Supabase
        // session refresh before clearing. A single 401 here is likely a
        // stale token race during restore, not a genuine auth failure.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthLoading]);

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
      <ErrorBoundary section="landing">
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
        <ComparisonSection />
        <WorkspaceShowcaseSection />
        <CTASection
          onStartLearning={() => {
            useAppStore.getState().setAppMode('standalone');
            setShowLanding(false);
          }}
        />
        <FooterSection />
        {authModalMode && <AuthModal onClose={() => setAuthModalMode(null)} initialTab={authModalMode} />}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary section="application">
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <MainPanel />
        {isAddVideoModalOpen && <URLInputModal />}
        {authModalMode && <AuthModal onClose={() => setAuthModalMode(null)} initialTab={authModalMode} />}
        {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
        <button
          onClick={() => setShowFeedback(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl hover:border-indigo-300 transition-all duration-200 group"
          aria-label="Send Feedback"
        >
          <MessageSquare size={16} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
          <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Feedback</span>
        </button>
      </div>
    </ErrorBoundary>
  );
}
