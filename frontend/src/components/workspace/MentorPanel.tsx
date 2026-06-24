import { useEffect, useState, useRef } from 'react';
import { GraduationCap, Plus, Trash2, Loader2, Send, ArrowLeft, ChevronRight, Sparkles, Award, Brain, AlertTriangle, CheckCircle2, XCircle, HelpCircle, BookOpen, Target, Zap } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useMentorStore } from '../../store/useMentorStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { MentorSessionItem, MentorMessage, EndSessionResult } from '../../api/mentor';

function EvaluationBadge({ evaluation }: { evaluation: string | null | undefined }) {
  if (!evaluation) return null;
  if (evaluation === 'correct') return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (evaluation === 'partial') return <AlertTriangle size={14} className="text-amber-500" />;
  if (evaluation === 'incorrect') return <XCircle size={14} className="text-rose-500" />;
  return null;
}

function GapCard({ gap }: { gap: { concept: string; explanation: string; suggested_review: string } }) {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <AlertTriangle size={12} className="text-rose-500" />
        <span className="text-xs font-semibold text-rose-700">{gap.concept}</span>
      </div>
      <p className="text-xs text-rose-600 mb-1">{gap.explanation}</p>
      {gap.suggested_review && (
        <div className="flex items-start gap-1 text-[10px] text-indigo-600">
          <BookOpen size={10} className="mt-0.5 flex-shrink-0" />
          <span>{gap.suggested_review}</span>
        </div>
      )}
    </div>
  );
}

function SessionSummary({ summary }: { summary: EndSessionResult }) {
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Award size={16} className="text-emerald-600" />
          <span className="text-sm font-bold text-emerald-800">Session Complete</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white/60 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-600">{summary.total_questions}</p>
            <p className="text-[10px] text-emerald-500 font-medium">Questions</p>
          </div>
          <div className="bg-white/60 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-indigo-600">{summary.correct_count}</p>
            <p className="text-[10px] text-indigo-500 font-medium">Correct</p>
          </div>
          <div className="bg-white/60 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-600">{summary.accuracy_percentage}%</p>
            <p className="text-[10px] text-amber-500 font-medium">Accuracy</p>
          </div>
        </div>
        {summary.summary && (
          <p className="text-sm text-gray-700 leading-relaxed">{summary.summary}</p>
        )}
      </div>

      {/* Topics Covered */}
      {summary.topics_covered.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain size={12} className="text-indigo-500" />
            <span className="text-xs font-semibold text-gray-700">Topics Covered</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {summary.topics_covered.map((t, i) => (
              <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-medium">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {summary.strengths.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span className="text-xs font-semibold text-gray-700">Strengths</span>
          </div>
          <ul className="space-y-1">
            {summary.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                <span className="text-emerald-400 mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {summary.weaknesses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} className="text-amber-500" />
            <span className="text-xs font-semibold text-gray-700">Areas to Improve</span>
          </div>
          <ul className="space-y-1">
            {summary.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                <span className="text-amber-400 mt-0.5">•</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {summary.gap_report.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Target size={12} className="text-rose-500" />
            <span className="text-xs font-semibold text-gray-700">Knowledge Gaps</span>
          </div>
          <div className="space-y-1.5">
            {summary.gap_report.map((gap, i) => (
              <GapCard key={i} gap={gap} />
            ))}
          </div>
        </div>
      )}

      {summary.recommended_focus && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={12} className="text-indigo-500" />
            <span className="text-xs font-semibold text-indigo-700">Recommended Focus</span>
          </div>
          <p className="text-xs text-indigo-600">{summary.recommended_focus}</p>
        </div>
      )}
    </div>
  );
}

export function MentorPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const {
    sessions, activeSession, messages, respondResult, endResult,
    loading, responding, starting,
    loadSessions, startSession, respond, endSession, loadSession, deleteSession, clearActiveSession,
  } = useMentorStore();

  const [view, setView] = useState<'list' | 'active' | 'detail'>('list');
  const [topic, setTopic] = useState('');
  const [answer, setAnswer] = useState('');
  const [detailSession, setDetailSession] = useState<MentorSessionItem | null>(null);
  const [detailMessages, setDetailMessages] = useState<MentorMessage[]>([]);
  const [detailEndResult, setDetailEndResult] = useState<EndSessionResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeWorkspaceId && isAuthenticated) {
      loadSessions(activeWorkspaceId);
    }
  }, [activeWorkspaceId, isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStart = async () => {
    if (!activeWorkspaceId || !topic.trim()) return;
    const sessionId = await startSession(activeWorkspaceId, topic.trim());
    if (sessionId) {
      setView('active');
      setTopic('');
    }
  };

  const handleSend = async () => {
    if (!answer.trim() || responding) return;
    const text = answer.trim();
    setAnswer('');
    await respond(text);
  };

  const handleEnd = async () => {
    await endSession();
  };

  const handleViewDetail = async (session: MentorSessionItem) => {
    setDetailSession(session);
    const msgs: MentorMessage[] = JSON.parse(session.messages || '[]');
    setDetailMessages(msgs);

    if (session.status === 'completed' && session.gap_report) {
      try {
        const gaps = JSON.parse(session.gap_report);
        const summary = session.summary || '';
        const totalMsgs = msgs.filter(m => m.role === 'ai').length;
        const correctMsgs = msgs.filter(m => m.evaluation === 'correct').length;
        setDetailEndResult({
          session_id: session.id,
          summary,
          gap_report: gaps,
          topics_covered: [],
          correct_count: session.correct_count || correctMsgs,
          total_questions: session.total_questions || totalMsgs,
          accuracy_percentage: session.total_questions > 0 ? Math.round(((session.correct_count || correctMsgs) / (session.total_questions || totalMsgs)) * 100) : 0,
          strengths: [],
          weaknesses: [],
          recommended_focus: '',
        });
      } catch {
        setDetailEndResult(null);
      }
    } else {
      setDetailEndResult(null);
    }
    setView('detail');
  };

  const handleBackToList = () => {
    clearActiveSession();
    setView('list');
    if (activeWorkspaceId) loadSessions(activeWorkspaceId);
  };

  if (!isAuthenticated || !activeWorkspaceId) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {view !== 'list' && (
            <button
              onClick={handleBackToList}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <GraduationCap size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">AI Mentor</h2>
            <p className="text-[10px] text-gray-400">Interactive tutoring sessions</p>
          </div>
        </div>
        {view === 'list' && (
          <button
            onClick={() => { setView('active'); clearActiveSession(); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
          >
            <Plus size={12} />
            New Session
          </button>
        )}
        {view === 'active' && activeSession && activeSession.status === 'active' && (
          <button
            onClick={handleEnd}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all"
          >
            End Session
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* List View */}
        {view === 'list' && (
          <>
            {!activeSession && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap size={28} className="text-violet-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">AI Mentor Sessions</h3>
                <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
                  Interactive tutoring where the AI quizzes you to assess and deepen your understanding.
                </p>
                <button
                  onClick={() => { setView('active'); clearActiveSession(); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25 transition-all"
                >
                  <Plus size={14} />
                  Start a Mentor Session
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : sessions.length === 0 ? null : (
              <div className="space-y-1">
                {sessions.map((s) => {
                  const msgs: MentorMessage[] = JSON.parse(s.messages || '[]');
                  const qCount = msgs.filter(m => m.role === 'ai').length;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-200 hover:shadow-sm cursor-pointer transition-all group"
                      onClick={() => handleViewDetail(s)}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        s.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'
                      }`}>
                        {s.status === 'completed' ? <CheckCircle2 size={16} /> : <GraduationCap size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{s.topic}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                          <span>{qCount} questions</span>
                          <span>•</span>
                          <span>{s.correct_count}/{s.total_questions} correct</span>
                          <span>•</span>
                          <span className={s.status === 'completed' ? 'text-emerald-500' : 'text-violet-500'}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Active Session View */}
        {view === 'active' && !activeSession && (
          <div className="max-w-lg mx-auto pt-12">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <GraduationCap size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Start a Mentor Session</h3>
                  <p className="text-[11px] text-gray-400">What topic would you like to be quizzed on?</p>
                </div>
              </div>

              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleStart(); }}
                placeholder="e.g., Machine Learning, BFS vs DFS, React hooks..."
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 mb-3"
              />

              <button
                onClick={handleStart}
                disabled={!topic.trim() || starting}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {starting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {starting ? 'Starting...' : 'Start Session'}
              </button>
            </div>
          </div>
        )}

        {/* Active Conversation */}
        {view === 'active' && activeSession && (
          <div className="space-y-3 max-w-3xl mx-auto">
            {/* Status badge */}
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg">
              <GraduationCap size={14} className="text-violet-500" />
              <span className="text-xs font-semibold text-violet-700 flex-1 truncate">{activeSession.topic}</span>
              <span className="text-[10px] text-violet-500 font-mono">
                {messages.filter(m => m.role === 'user').length} answered
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}>
                    {msg.role === 'ai' && msg.evaluation && (
                      <div className="flex items-center gap-1 mb-1">
                        <EvaluationBadge evaluation={msg.evaluation} />
                        <span className="text-[10px] font-medium text-gray-500 capitalize">{msg.evaluation}</span>
                      </div>
                    )}
                    <p>{msg.content}</p>
                    {msg.role === 'ai' && msg.correct_answer && msg.evaluation !== 'correct' && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                        <p className="text-[10px] font-medium text-gray-400 mb-0.5">Correct answer:</p>
                        <p className="text-[11px] text-emerald-600">{msg.correct_answer}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {responding && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5">
                    <Loader2 size={14} className="animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* End result */}
            {endResult && <SessionSummary summary={endResult} />}

            {/* Input */}
            {!endResult && activeSession.status === 'active' && (
              <div className="flex items-center gap-2 pt-2 sticky bottom-0 bg-white">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={messages.length > 0 && messages[messages.length - 1].role === 'ai' ? 'Type your answer...' : 'Waiting for AI question...'}
                  disabled={responding || messages.length === 0 || messages[messages.length - 1].role !== 'ai'}
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none disabled:opacity-50"
                  rows={2}
                />
                <button
                  onClick={handleSend}
                  disabled={responding || !answer.trim()}
                  className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all self-end"
                >
                  {responding ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Detail View */}
        {view === 'detail' && detailSession && (
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  detailSession.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'
                }`}>
                  {detailSession.status === 'completed' ? <CheckCircle2 size={18} /> : <GraduationCap size={18} />}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">{detailSession.topic}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>{detailMessages.filter(m => m.role === 'ai').length} questions</span>
                    <span>•</span>
                    <span>{detailSession.correct_count}/{detailSession.total_questions} correct</span>
                    <span>•</span>
                    <span className={detailSession.status === 'completed' ? 'text-emerald-500' : 'text-violet-500'}>
                      {detailSession.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversation */}
            <div className="space-y-2">
              {detailMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}>
                    {msg.role === 'ai' && msg.evaluation && (
                      <div className="flex items-center gap-1 mb-1">
                        <EvaluationBadge evaluation={msg.evaluation} />
                        <span className="text-[10px] font-medium text-gray-500 capitalize">{msg.evaluation}</span>
                      </div>
                    )}
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {detailEndResult && <SessionSummary summary={detailEndResult} />}
          </div>
        )}
      </div>
    </div>
  );
}
