import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useChatSessionStore } from '../../store/useChatSessionStore';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { useMentorStore } from '../../store/useMentorStore';
import { useQuizStore } from '../../store/useQuizStore';

interface HomeDashboardProps {
  onNavigate: (view: 'chat' | 'flashcard' | 'quiz' | 'progress' | 'import' | 'mentor') => void;
}

export function HomeDashboard({ onNavigate }: HomeDashboardProps) {
  const { user } = useAuthStore();
  const { activeWorkspaceId, loadWorkspaces, workspaces } = useWorkspaceStore();
  const { sessions, loadSessions } = useChatSessionStore();
  const { reviewQueue, loadReviewQueue } = useFlashcardStore();
  const { sessions: mentorSessions, loadSessions: loadMentorSessions } = useMentorStore();
  const { quizzes, loadQuizzes } = useQuizStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (!activeWorkspaceId) {
        await loadWorkspaces();
      }
      if (activeWorkspaceId) {
        await Promise.all([
          loadSessions(activeWorkspaceId).catch(() => {}),
          loadReviewQueue(activeWorkspaceId).catch(() => {}),
          loadMentorSessions(activeWorkspaceId).catch(() => {}),
          loadQuizzes(activeWorkspaceId).catch(() => {}),
        ]);
      }
      setLoading(false);
    };
    init();
  }, [activeWorkspaceId]);

  const workspaceName = workspaces.find((w) => w.id === activeWorkspaceId)?.name || '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.display_name || user?.email?.split('@')[0] || 'there';

  const recentSessions = sessions.slice(0, 3);
  const pendingFlashcards = reviewQueue.length;
  const recentMentor = mentorSessions.length > 0 ? mentorSessions[0] : null;
  const pendingQuizzes = quizzes.filter((q) => !q.completed_at).length;

  const otherWorkspaces = workspaces.filter((w) => w.id !== activeWorkspaceId).slice(0, 3);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-slate-400">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto w-full px-8 py-10 space-y-10">

        {/* Greeting */}
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {greeting}, {displayName}
          </h1>
          {workspaceName && (
            <p className="text-sm text-slate-400 mt-0.5">{workspaceName}</p>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-6 text-sm">
          <button
            onClick={() => onNavigate('chat')}
            className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            Start chat
          </button>
          <button
            onClick={() => onNavigate('import')}
            className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            Import source
          </button>
          <button
            onClick={async () => {
              await loadWorkspaces();
              onNavigate('chat');
            }}
            className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            New workspace
          </button>
        </div>

        {/* Continue learning */}
        <section>
          <h2 className="text-xs font-medium text-slate-400 mb-3">Continue learning</h2>
          {recentSessions.length > 0 ? (
            <div className="space-y-1">
              {recentSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onNavigate('chat')}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 flex-shrink-0">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="text-sm text-slate-700 truncate flex-1">{s.title}</span>
                  <span className="text-xs text-slate-400">{s.message_count}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 px-3.5 py-3">No conversations yet. Start a chat to ask questions about your sources.</p>
          )}
        </section>

        {/* Other workspaces */}
        {otherWorkspaces.length > 0 && (
          <section>
            <h2 className="text-xs font-medium text-slate-400 mb-3">Workspaces</h2>
            <div className="space-y-1">
              {otherWorkspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={async () => {
                    const { setActiveWorkspace } = useWorkspaceStore.getState();
                    await setActiveWorkspace(w.id);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 flex-shrink-0">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span className="text-sm text-slate-700">{w.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Reviews row */}
        {(pendingFlashcards > 0 || pendingQuizzes > 0 || recentMentor) && (
          <section>
            <h2 className="text-xs font-medium text-slate-400 mb-3">Reviews</h2>
            <div className="space-y-1">
              {pendingFlashcards > 0 && (
                <button
                  onClick={() => onNavigate('flashcard')}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 flex-shrink-0">
                    <path d="M18 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2z" />
                    <line x1="8" y1="10" x2="16" y2="10" />
                    <line x1="8" y1="14" x2="12" y2="14" />
                  </svg>
                  <span className="text-sm text-slate-700 flex-1">Flashcards due</span>
                  <span className="text-xs font-medium text-slate-600">{pendingFlashcards}</span>
                </button>
              )}
              {pendingQuizzes > 0 && (
                <button
                  onClick={() => onNavigate('quiz')}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className="text-sm text-slate-700 flex-1">Quizzes pending</span>
                  <span className="text-xs font-medium text-slate-600">{pendingQuizzes}</span>
                </button>
              )}
              {recentMentor && (
                <button
                  onClick={() => onNavigate('mentor')}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 flex-shrink-0">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span className="text-sm text-slate-700 flex-1 truncate">{recentMentor.topic}</span>
                  <span className="text-xs text-slate-400">Mentor</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* Empty state hint */}
        {recentSessions.length === 0 && pendingFlashcards === 0 && !recentMentor && otherWorkspaces.length === 0 && (
          <div className="border border-slate-100 rounded-lg px-5 py-6 text-center">
            <p className="text-sm text-slate-500">Import a source or start a chat to begin learning.</p>
          </div>
        )}

      </div>
    </div>
  );
}
