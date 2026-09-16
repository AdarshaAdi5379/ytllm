import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Loader2, MessageSquare, ShieldAlert, ArrowLeft } from 'lucide-react';
const Sidebar = lazy(() => import('./components/layout/Sidebar').then((m) => ({ default: m.Sidebar })));
const MainPanel = lazy(() => import('./components/layout/MainPanel').then((m) => ({ default: m.MainPanel })));
const CareersPage = lazy(() => import('./components/careers/CareersPage').then((m) => ({ default: m.CareersPage })));
const JobDetailPage = lazy(() => import('./components/careers/JobDetailPage').then((m) => ({ default: m.JobDetailPage })));
const AdminCareersDashboard = lazy(() => import('./components/admin/AdminCareersDashboard').then((m) => ({ default: m.AdminCareersDashboard })));
import { URLInputModal } from './components/modals/URLInputModal';
import { AuthModal } from './components/auth/AuthModal';
import { FeedbackModal } from './components/modals/FeedbackModal';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { HeroSection } from './components/landing/HeroSection';
const HowItWorksSection = lazy(() => import('./components/landing/HowItWorksSection').then((m) => ({ default: m.HowItWorksSection })));
const ComparisonSection = lazy(() => import('./components/landing/ComparisonSection').then((m) => ({ default: m.ComparisonSection })));
const WorkspaceShowcaseSection = lazy(() => import('./components/landing/WorkspaceShowcaseSection').then((m) => ({ default: m.WorkspaceShowcaseSection })));
const CTASection = lazy(() => import('./components/landing/CTASection').then((m) => ({ default: m.CTASection })));
const FooterSection = lazy(() => import('./components/landing/FooterSection').then((m) => ({ default: m.FooterSection })));
import { useVideoStore } from './store/useVideoStore';
import { useAuthStore } from './store/useAuthStore';
import { useAppStore } from './store/useAppStore';
import { fetchSavedVideos, fetchSavedVideoDetail, setAuthToken } from './api/client';

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [showLanding, setShowLanding] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const isAddVideoModalOpen = useVideoStore((s) => s.isAddVideoModalOpen);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const user = useAuthStore((s) => s.user);
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

  // Handle browser URL path changes (e.g. /careers, /careers/:slug, /admin/careers)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

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

  // --- Careers & Admin Routes ---
  if (currentPath === '/careers' || currentPath === '/careers/') {
    return (
      <ErrorBoundary section="careers">
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-white"><Loader2 size={32} className="text-indigo-600 animate-spin" /></div>}>
          <CareersPage
            onNavigateJob={(slug) => navigateTo(`/careers/${slug}`)}
            onNavigateHome={() => navigateTo('/')}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (currentPath.startsWith('/careers/')) {
    const slug = currentPath.replace(/^\/careers\//, '').replace(/\/$/, '');
    return (
      <ErrorBoundary section="careers-detail">
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-white"><Loader2 size={32} className="text-indigo-600 animate-spin" /></div>}>
          <JobDetailPage
            slug={slug}
            onNavigateBack={() => navigateTo('/careers')}
            onNavigateHome={() => navigateTo('/')}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (currentPath === '/admin/careers' || currentPath.startsWith('/admin/careers/')) {
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Admin Sign In Required</h2>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            You must be signed in with an administrator account to access the careers dashboard.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('/')}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Back to Home
            </button>
            <button
              onClick={() => setAuthModalMode('login')}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              Sign In
            </button>
          </div>
          {authModalMode && <AuthModal onClose={() => setAuthModalMode(null)} initialTab={authModalMode} />}
        </div>
      );
    }

    if (!user?.is_admin) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 max-w-md mb-6">
            Your account ({user?.email}) does not have administrative permissions to manage job postings or review candidates.
          </p>
          <button
            onClick={() => navigateTo('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Return to Workspace</span>
          </button>
        </div>
      );
    }

    return (
      <ErrorBoundary section="admin-careers">
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 size={32} className="text-indigo-600 animate-spin" /></div>}>
          <AdminCareersDashboard
            onNavigateHome={() => navigateTo('/')}
            onViewPublicCareers={() => navigateTo('/careers')}
            onViewJobDetail={(slug) => navigateTo(`/careers/${slug}`)}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // --- Main App & Landing ---
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
        <Suspense fallback={null}>
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
        </Suspense>
        {authModalMode && <AuthModal onClose={() => setAuthModalMode(null)} initialTab={authModalMode} />}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary section="application">
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Suspense fallback={<div className="flex flex-1 items-center justify-center bg-gray-50 text-sm text-gray-400">Loading...</div>}>
          <Sidebar />
          <MainPanel />
        </Suspense>
        {isAddVideoModalOpen && <URLInputModal />}
        {authModalMode && <AuthModal onClose={() => setAuthModalMode(null)} initialTab={authModalMode} />}
        {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
        <button
          onClick={() => setShowFeedback(true)}
          className="fixed bottom-20 right-3 sm:bottom-20 sm:right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 p-3 sm:px-4 sm:py-2.5 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl hover:border-indigo-300 transition-all duration-200 group"
          aria-label="Send Feedback"
        >
          <MessageSquare size={16} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
          <span className="hidden sm:inline text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Feedback</span>
        </button>
      </div>
    </ErrorBoundary>
  );
}
