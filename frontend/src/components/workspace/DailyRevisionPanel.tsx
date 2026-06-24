import { useEffect, useState } from 'react';
import {
  Loader2, CheckCircle, Clock, Brain, BookOpen,
  AlertTriangle, TrendingUp, Sparkles, Zap, ChevronRight, X,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useDailyRevisionStore } from '../../store/useDailyRevisionStore';

export function DailyRevisionPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { summary, suggestions, loading, loadingSuggestions, loadSummary, loadSuggestions, error } = useDailyRevisionStore();
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeWorkspaceId) {
      loadSummary(activeWorkspaceId);
      loadSuggestions(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const toggleAnswer = (id: string) => {
    setShowAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!activeWorkspaceId) return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle size={24} className="mx-auto text-amber-500 mb-2" />
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Daily Revision</h2>
            <p className="text-xs text-gray-400">
              {summary?.date
                ? new Date(summary.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Today'}
            </p>
          </div>
        </div>

        {/* Streak banner */}
        {summary && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Revision Streak</p>
                <p className="text-3xl font-black mt-1">{summary.activity.streak_days} days</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Flashcards reviewed</p>
                <p className="text-lg font-bold">{summary.flashcards.reviewed_today} today</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats grid */}
        {summary && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <Brain size={16} className="mx-auto text-indigo-500 mb-1" />
              <p className="text-xl font-bold text-gray-800">{summary.flashcards.due_today}</p>
              <p className="text-[10px] text-gray-400 font-medium">Cards Due</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <BookOpen size={16} className="mx-auto text-emerald-500 mb-1" />
              <p className="text-xl font-bold text-gray-800">{summary.activity.quizzes_last_7d}</p>
              <p className="text-[10px] text-gray-400 font-medium">Quizzes (7d)</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <TrendingUp size={16} className="mx-auto text-violet-500 mb-1" />
              <span className="inline-flex items-center justify-center text-xl font-bold text-gray-800">
                {summary.weak_areas.length}
              </span>
              <p className="text-[10px] text-gray-400 font-medium">Weak Areas</p>
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        {suggestions && (
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={14} className="text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">AI Suggestion</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{suggestions}</p>
          </div>
        )}
        {loadingSuggestions && (
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl">
            <Loader2 size={12} className="animate-spin text-gray-400" />
            <span className="text-xs text-gray-400">Generating suggestions...</span>
          </div>
        )}

        {/* Learning Path */}
        {summary?.learning_path && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Learning Path Progress
              </span>
              <span className="text-xs font-bold text-indigo-600">{summary.learning_path.percentage}%</span>
            </div>
            <p className="text-sm font-medium text-gray-800 mb-2 truncate">{summary.learning_path.title}</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                style={{ width: `${summary.learning_path.percentage}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {summary.learning_path.completed} of {summary.learning_path.total} topics
            </p>
          </div>
        )}

        {/* Due Flashcards */}
        {summary && summary.flashcards.due.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-indigo-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Due Flashcards</span>
              </div>
              <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {summary.flashcards.due.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {summary.flashcards.due.slice(0, 5).map((card) => (
                <div key={card.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{card.question}</p>
                      {showAnswers[card.id] && (
                        <p className="text-xs text-gray-500 mt-1 italic">{card.answer}</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleAnswer(card.id)}
                      className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex-shrink-0 px-2 py-0.5 rounded hover:bg-indigo-50 transition-all"
                    >
                      {showAnswers[card.id] ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      card.difficulty === 'hard' ? 'bg-red-100 text-red-600' :
                      card.difficulty === 'easy' ? 'bg-green-100 text-green-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {card.difficulty}
                    </span>
                    {card.total_reviews > 0 && (
                      <span className="text-[10px] text-gray-400">
                        {Math.round((card.correct_reviews / card.total_reviews) * 100)}% correct
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {summary.flashcards.due.length > 5 && (
                <div className="px-4 py-2 text-center">
                  <span className="text-[10px] text-gray-400">+{summary.flashcards.due.length - 5} more due</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weak Areas */}
        {summary && summary.weak_areas.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Weak Areas</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {summary.weak_areas.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {summary.weak_areas.map((w, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={10} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800">{w.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          w.difficulty === 'hard' ? 'bg-red-100 text-red-600' :
                          w.difficulty === 'easy' ? 'bg-green-100 text-green-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {w.difficulty}
                        </span>
                        <span className="text-[10px] text-rose-500">{w.correct_rate}% correct</span>
                        <span className="text-[10px] text-gray-400">{w.total_reviews} reviews</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missed Questions */}
        {summary && summary.missed_questions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-rose-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Missed Questions</span>
              </div>
              <span className="text-[10px] font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                {summary.missed_questions.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {summary.missed_questions.map((m, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <X size={10} className="text-rose-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800">{m.question}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">from: {m.quiz_title}</p>
                      {m.explanation && (
                        <p className="text-[10px] text-gray-500 mt-1 italic">{m.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low-score quizzes */}
        {summary && summary.low_score_quizzes.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Low-Score Quizzes</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {summary.low_score_quizzes.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {summary.low_score_quizzes.map((q) => (
                <div key={q.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 truncate">{q.title}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{q.quiz_type.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-bold text-rose-500">{q.percentage}%</p>
                    <p className="text-[10px] text-gray-400">{q.score}/{q.max_score}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {summary && !summary.flashcards.due.length && !summary.weak_areas.length && !summary.missed_questions.length && !summary.low_score_quizzes.length && (
          <div className="text-center py-12">
            <CheckCircle size={40} className="mx-auto text-emerald-400 mb-3" />
            <p className="text-lg font-semibold text-gray-700">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No cards due, no weak areas, and no missed questions.</p>
          </div>
        )}

        {/* Activity summary */}
        {summary && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">7-Day Activity</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-indigo-600">{summary.activity.reviews_last_7d}</p>
                <p className="text-[10px] text-gray-400">Flashcard Reviews</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-emerald-600">{summary.activity.quizzes_last_7d}</p>
                <p className="text-[10px] text-gray-400">Quizzes Taken</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


