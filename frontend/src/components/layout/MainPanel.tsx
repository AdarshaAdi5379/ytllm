import { lazy, Suspense } from 'react';
import { LogIn, UserPlus, MessageSquare, Youtube } from 'lucide-react';
import { useVideoStore } from '../../store/useVideoStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { VideoHeader } from '../video/VideoHeader';
import { VideoPlayer } from '../video/VideoPlayer';
import { SummaryCard } from '../video/SummaryCard';
import { TranscriptPanel } from '../video/TranscriptPanel';
import { ChatWindow } from '../chat/ChatWindow';
import { ChatInput } from '../chat/ChatInput';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { useChat } from '../../hooks/useChat';
const WorkspaceChatPanel = lazy(() => import('../workspace/WorkspaceChatPanel').then((m) => ({ default: m.WorkspaceChatPanel })));
const StandaloneChatPanel = lazy(() => import('../standalone/StandaloneChatPanel').then((m) => ({ default: m.StandaloneChatPanel })));
const OnboardingWizard = lazy(() => import('../onboarding/OnboardingWizard').then((m) => ({ default: m.OnboardingWizard })));


function PanelLoading() {
  return <div className="flex-1 flex items-center justify-center bg-white text-sm text-gray-400">Loading...</div>;
}

export function MainPanel() {
  const { videos, activeVideoId } = useVideoStore();
  const video = activeVideoId ? videos[activeVideoId] : null;
  const { sendMessage } = useChat(activeVideoId);
  const { isAuthenticated, isAuthLoading, showOnboarding, setAuthModalMode } = useAuthStore();
  const { appMode } = useAppStore();

  if (showOnboarding && isAuthenticated && (appMode === 'workspace' || !video)) {
    return (
      <Suspense fallback={<PanelLoading />}>
        <OnboardingWizard />
      </Suspense>
    );
  }

  // 1. Workspace mode takes strict precedence when in workspace appMode
  if (appMode === 'workspace') {
    if (isAuthenticated) {
      return (
        <Suspense fallback={<PanelLoading />}>
          <WorkspaceChatPanel />
        </Suspense>
      );
    }

    return (
      <main className="flex-1 flex flex-col bg-white">
        {/* Top bar with auth buttons */}
        <header className="flex items-center justify-end pl-12 pr-6 py-4 lg:pl-6 border-b border-gray-100">
          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAuthModalMode('login')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              >
                <LogIn size={16} />
                Sign In
              </button>
              <button
                onClick={() => setAuthModalMode('register')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all"
              >
                <UserPlus size={16} />
                Sign Up
              </button>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Signed in</span>
          )}
        </header>

        {/* Centered chat interface */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-lg text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
              <Youtube size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Scritur</h1>
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
              Sign in to access your workspaces, flashcards, quizzes, notes, and study tools.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 2. Standalone mode: if active video is selected, show video chat
  if (video) {
    if (video.status === 'loading') {
      return (
        <main className="flex-1 overflow-hidden">
          <LoadingSkeleton />
        </main>
      );
    }

    if (video.status === 'error') {
      return (
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Failed to load video</h2>
            <p className="text-sm text-gray-500">{video.errorMessage || 'An error occurred while loading this video.'}</p>
          </div>
        </main>
      );
    }

    const handleSend = (question: string) => {
      sendMessage(question, video.chatHistory, video.systemPrompt);
    };

    return (
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <VideoHeader videoId={video.videoId} />
        <VideoPlayer videoId={video.videoId} />
        
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col relative bg-white min-w-0">
            <ChatWindow videoId={video.videoId} />
            <div className="p-3 sm:p-4 bg-gradient-to-t from-white via-white to-transparent">
              <ChatInput
                videoId={video.videoId}
                onSend={handleSend}
                disabled={video.isStreaming}
              />
            </div>
          </div>

          {/* Info Section (Right Sidebar) - hidden on mobile */}
          <div className="hidden lg:flex w-80 flex-shrink-0 flex-col bg-slate-50/50 border-l border-slate-100 overflow-y-auto scrollbar-thin">
            <div className="p-4 space-y-4">
              <SummaryCard videoId={video.videoId} onQuestionClick={handleSend} />
              <TranscriptPanel videoId={video.videoId} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 3. Default standalone view (no active video selected)
  return (
    <Suspense fallback={<PanelLoading />}>
      <StandaloneChatPanel />
    </Suspense>
  );
}
