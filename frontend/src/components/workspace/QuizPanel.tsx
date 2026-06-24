import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Loader2, Sparkles, Brain, ChevronRight, ChevronDown, BarChart3 } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useQuizStore } from '../../store/useQuizStore';
import { fetchSources, type SourceItem } from '../../api/workspace';
import { QUIZ_TYPES, QUIZ_TYPE_LABELS, QUIZ_TYPE_ICONS, type QuizType } from '../../api/quiz';
import { QuizTake } from './QuizTake';

const QUIZ_TYPE_COLORS: Record<string, string> = {
  mcq: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  coding: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  short_answer: 'text-amber-600 bg-amber-50 border-amber-200',
  long_answer: 'text-violet-600 bg-violet-50 border-violet-200',
  case_study: 'text-rose-600 bg-rose-50 border-rose-200',
  interview: 'text-sky-600 bg-sky-50 border-sky-200',
};

export function QuizPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { quizzes, loading, takingQuiz, loadQuizzes, generateQuiz, deleteQuiz, clearTakingQuiz, startQuiz } = useQuizStore();

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [selectedQuizType, setSelectedQuizType] = useState<QuizType>('mcq');
  const [questionCount, setQuestionCount] = useState(5);
  const [timeLimit, setTimeLimit] = useState<number>(0);
  const [generating, setGenerating] = useState(false);
  const [filterType, setFilterType] = useState('');

  const [expandedSections, setExpandedSections] = useState({ list: true });
  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !(prev as any)[key] }));
  };

  const loadSources = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const items = await fetchSources(activeWorkspaceId);
      setSources(items);
    } catch {
      setSources([]);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadQuizzes(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (showGenerate && sources.length === 0) {
      loadSources();
    }
  }, [showGenerate]);

  // If taking a quiz, show the QuizTake view
  if (takingQuiz) {
    return <QuizTake quiz={takingQuiz} onBack={clearTakingQuiz} />;
  }

  const handleGenerate = async () => {
    if (!selectedSourceId || generating) return;
    setGenerating(true);
    try {
      await generateQuiz(
        selectedSourceId,
        selectedQuizType,
        questionCount,
        timeLimit > 0 ? timeLimit : undefined,
      );
      setShowGenerate(false);
      setSelectedSourceId('');
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  const filteredQuizzes = filterType
    ? quizzes.filter((q) => q.quiz_type === filterType)
    : quizzes;

  if (!activeWorkspaceId) return null;

  // Stats
  const totalCount = quizzes.length;
  const completedCount = quizzes.filter((q) => q.completed_at).length;
  const avgScore = completedCount > 0
    ? Math.round(quizzes.filter((q) => q.completed_at).reduce((acc, q) => acc + ((q.score ?? 0) / (q.max_score ?? 1)) * 100, 0) / completedCount)
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Stats */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('list')}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            {expandedSections.list ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <BarChart3 size={14} className="text-indigo-500" />
            Overview
          </button>
          {expandedSections.list && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{totalCount}</p>
                  <p className="text-[10px] text-indigo-500 font-medium uppercase tracking-wider mt-1">Total</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
                  <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider mt-1">Completed</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{avgScore}%</p>
                  <p className="text-[10px] text-amber-500 font-medium uppercase tracking-wider mt-1">Avg Score</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generate button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all"
          >
            <Sparkles size={12} />
            Generate Quiz
          </button>
        </div>

        {/* Generate form */}
        {showGenerate && (
          <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-700">Generate Quiz from Source</h3>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            >
              <option value="">Select a source...</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.title} ({s.source_type})</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">Type</label>
                <select
                  value={selectedQuizType}
                  onChange={(e) => setSelectedQuizType(e.target.value as QuizType)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400"
                >
                  {QUIZ_TYPES.map((t) => (
                    <option key={t} value={t}>{QUIZ_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">Questions</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">Time Limit (min)</label>
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                  placeholder="0 = no limit"
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowGenerate(false); setSelectedSourceId(''); }}
                className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!selectedSourceId || generating}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
              >
                {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        )}

        {/* Type filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType('')}
            className={`text-[10px] font-semibold px-2 py-1 rounded-full transition-all ${
              !filterType ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {QUIZ_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-[10px] font-semibold px-2 py-1 rounded-full transition-all ${
                filterType === t
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {QUIZ_TYPE_ICONS[t]} {QUIZ_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Quiz list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={16} className="animate-spin text-gray-400" />
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            {quizzes.length === 0 ? 'No quizzes yet. Generate one from a source!' : 'No matches for your filter.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredQuizzes.map((quiz) => {
              const questions = (() => { try { return JSON.parse(quiz.questions); } catch { return []; } })();
              const isCompleted = !!quiz.completed_at;
              const pct = isCompleted && quiz.max_score ? Math.round((quiz.score ?? 0) / quiz.max_score * 100) : 0;

              return (
                <div
                  key={quiz.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all"
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${QUIZ_TYPE_COLORS[quiz.quiz_type] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                            {QUIZ_TYPE_ICONS[quiz.quiz_type as QuizType] || '📝'} {QUIZ_TYPE_LABELS[quiz.quiz_type as QuizType] || quiz.quiz_type}
                          </span>
                          {isCompleted && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              pct >= 70 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {pct}%
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-800 truncate">{quiz.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-gray-400">{questions.length} questions</span>
                          {quiz.time_limit_minutes && (
                            <span className="text-[10px] text-gray-400">{quiz.time_limit_minutes} min</span>
                          )}
                          {isCompleted ? (
                            <span className="text-[10px] text-emerald-500 font-medium">
                              Score: {quiz.score}/{quiz.max_score}
                            </span>
                          ) : (
                            <span className="text-[10px] text-indigo-500 font-medium">Ready to take</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startQuiz(quiz)}
                          className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all ${
                            isCompleted
                              ? 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                              : 'text-white bg-indigo-600 hover:bg-indigo-700'
                          }`}
                        >
                          {isCompleted ? 'Review' : 'Take Quiz'}
                        </button>
                        <button
                          onClick={() => deleteQuiz(quiz.id)}
                          className="p-1 text-gray-400 hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
