import { useEffect, useState } from 'react';
import {
  Loader2, TrendingUp, BarChart3, Clock, Brain, BookOpen,
  Sparkles, Zap, Star, Award, Target, ChevronRight, X,
  CheckCircle2, XCircle, AlertCircle, HelpCircle, Layers,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useProgressStore } from '../../store/useProgressStore';
import type { TopicMasteryItem } from '../../api/progress';

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Not practiced yet';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Practiced just now';
  if (diffSec < 3600) return `Practiced ${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `Practiced ${Math.floor(diffSec / 3600)}h ago`;
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return 'Practiced yesterday';
  return `Practiced ${days}d ago`;
}

function HeatmapCell({ count, maxCount }: { count: number; maxCount: number }) {
  if (count === 0) return <div className="w-3 h-3 rounded-sm bg-gray-100" />;
  const intensity = maxCount > 0 ? count / maxCount : 0;
  const bg =
    intensity > 0.75 ? 'bg-emerald-500' :
    intensity > 0.5 ? 'bg-emerald-400' :
    intensity > 0.25 ? 'bg-emerald-300' :
    'bg-emerald-200';
  return <div className={`w-3 h-3 rounded-sm ${bg}`} title={`${count} activities`} />;
}

export function ProgressDashboardPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const {
    dashboard,
    weeklyReport,
    selectedTopicDetails,
    loading,
    loadingReport,
    loadingTopicDetails,
    loadDashboard,
    loadWeeklyReport,
    loadTopicDetails,
    clearTopicDetails,
  } = useProgressStore();

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadDashboard(activeWorkspaceId);
      loadWeeklyReport(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const handleOpenTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    loadTopicDetails(topicId);
  };

  const handleCloseTopicModal = () => {
    setSelectedTopicId(null);
    clearTopicDetails();
  };

  if (!activeWorkspaceId) return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const d = dashboard;
  const topicMasteries = d?.topic_mastery || [];
  const focusAreas = d?.focus_areas || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-y-auto px-4 py-4 pl-12 lg:pl-4 space-y-4 scrollbar-thin">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Progress Dashboard</h2>
            <p className="text-xs text-gray-400">Adaptive Mastery & learning analytics</p>
          </div>
        </div>

        {/* Knowledge Score */}
        {d && (
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Knowledge Score</p>
                <p className="text-4xl font-black mt-1">{d.knowledge_score}</p>
                <p className="text-xs opacity-70 mt-1">out of 1000</p>
              </div>
              <div className="text-right">
                <div className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center">
                  <Star size={28} className="text-yellow-300" fill="currentColor" />
                </div>
              </div>
            </div>
            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${d.knowledge_score / 10}%` }} />
            </div>
          </div>
        )}

        {/* Focus Areas (Highest Priority Weak Topics) */}
        {focusAreas.length > 0 && (
          <div className="bg-white border border-rose-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={15} className="text-rose-500" />
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Focus Areas</span>
              </div>
              <span className="text-[11px] text-gray-400">Recommended for revision</span>
            </div>

            <div className="space-y-2">
              {focusAreas.map((topic) => (
                <div
                  key={topic.topic_id}
                  onClick={() => handleOpenTopic(topic.topic_id)}
                  className="group flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      topic.status === 'weak' ? 'bg-rose-500' :
                      topic.status === 'learning' ? 'bg-amber-500' :
                      'bg-indigo-500'
                    }`} />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors truncate">
                        {topic.topic_name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {formatRelativeTime(topic.last_practiced_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-gray-700">
                      {Math.round(topic.mastery_score)}%
                    </span>
                    <span className={`text-[11px] px-2.5 py-1 rounded-md font-medium ${
                      topic.status === 'weak'
                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    }`}>
                      {topic.next_recommended_action}
                    </span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topic Mastery Section */}
        {topicMasteries.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-indigo-600" />
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Topic Mastery</span>
              </div>
              <span className="text-[11px] text-gray-400">{topicMasteries.length} topics identified</span>
            </div>

            <div className="space-y-3">
              {topicMasteries.map((topic) => {
                const score = Math.round(topic.mastery_score);
                const isWeak = topic.status === 'weak';
                const isMastered = topic.status === 'mastered';
                const isStrong = topic.status === 'strong';

                return (
                  <div
                    key={topic.topic_id}
                    onClick={() => handleOpenTopic(topic.topic_id)}
                    className="p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-slate-50/70 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900 truncate">{topic.topic_name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isWeak ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            isMastered ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            isStrong ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                            'bg-indigo-50 text-indigo-600 border border-indigo-100'
                          }`}>
                            {topic.status.charAt(0).toUpperCase() + topic.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatRelativeTime(topic.last_practiced_at)}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-mono font-bold text-gray-800">{score}%</span>
                        <p className="text-[10px] text-indigo-600 font-medium">
                          {topic.next_recommended_action}
                        </p>
                      </div>
                    </div>

                    {/* Progress indicator bar */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isWeak ? 'bg-rose-500' :
                          isMastered ? 'bg-emerald-500' :
                          isStrong ? 'bg-sky-500' :
                          'bg-indigo-500'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Report */}
        {loadingReport && (
          <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 rounded-xl">
            <Loader2 size={12} className="animate-spin text-indigo-400" />
            <span className="text-xs text-indigo-500">Generating weekly report...</span>
          </div>
        )}
        {weeklyReport && (
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={14} className="text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Weekly Report</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{weeklyReport}</p>
          </div>
        )}

        {d && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={14} className="text-indigo-500" />
                  <span className="text-xs font-semibold text-gray-600">Learning Hours</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{d.learning_hours.total_hours}h</p>
                <p className="text-[10px] text-gray-400">{d.learning_hours.total_minutes} minutes</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={14} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-gray-600">Topics Done</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{d.completed_topics.completed}</p>
                <p className="text-[10px] text-gray-400">of {d.completed_topics.total} ({d.completed_topics.percentage}%)</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-amber-500" />
                  <span className="text-xs font-semibold text-gray-600">Flashcards</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{d.flashcards.accuracy}%</p>
                <p className="text-[10px] text-gray-400">{d.flashcards.reviewed} of {d.flashcards.total} reviewed</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-violet-500" />
                  <span className="text-xs font-semibold text-gray-600">Quizzes</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{d.quizzes.accuracy}%</p>
                <p className="text-[10px] text-gray-400">{d.quizzes.total} taken</p>
              </div>
            </div>

            {/* Accuracy Overview */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-indigo-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Accuracy</span>
                <span className="text-xs text-gray-400 ml-auto">{d.accuracy.overall}% overall</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Flashcard</span>
                    <span className="font-semibold">{d.accuracy.flashcard}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${d.accuracy.flashcard}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Quiz</span>
                    <span className="font-semibold">{d.accuracy.quiz}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.accuracy.quiz}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Streak */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Streak</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{d.streak.current}</p>
                  <p className="text-[10px] text-amber-500 font-medium">Current</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{d.streak.longest}</p>
                  <p className="text-[10px] text-indigo-500 font-medium">Longest</p>
                </div>
              </div>
            </div>

            {/* Accuracy Trend (12 weeks) */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-emerald-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Weekly Trend</span>
              </div>
              <div className="space-y-1">
                {d.accuracy_trend.map((week) => {
                  const fcVal = week.flashcard ?? 0;
                  const qzVal = week.quiz ?? 0;
                  return (
                    <div key={week.week} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-14 flex-shrink-0">{week.label}</span>
                      <div className="flex-1 flex items-center gap-0.5 h-5">
                        <div
                          className="h-3 rounded-sm bg-indigo-400 transition-all"
                          style={{ width: `${fcVal}%` }}
                        />
                      </div>
                      <div className="flex-1 flex items-center gap-0.5 h-5">
                        <div
                          className="h-3 rounded-sm bg-emerald-400 transition-all"
                          style={{ width: `${qzVal}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 w-8 text-right font-mono">
                        {Math.round((fcVal + qzVal) / 2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-400" /> Flashcards</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" /> Quizzes</span>
              </div>
            </div>

            {/* Activity Heatmap */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award size={14} className="text-emerald-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Activity (90 days)</span>
              </div>

              {/* Month labels */}
              <div className="flex gap-0.5 mb-1 text-[8px] text-gray-400 ml-[18px]">
                {getMonthLabels(d.activity_heatmap).map((m, i) => (
                  <span key={i} style={{ width: `${m.span * 3 + (m.span - 1) * 1}px` }}>{m.label}</span>
                ))}
              </div>

              {/* Day labels + grid */}
              <div className="flex gap-0.5">
                <div className="flex flex-col gap-0.5 text-[8px] text-gray-400 mr-1">
                  <span className="h-3 flex items-center">Mon</span>
                  <span className="h-3 flex items-center" />
                  <span className="h-3 flex items-center">Wed</span>
                  <span className="h-3 flex items-center" />
                  <span className="h-3 flex items-center">Fri</span>
                  <span className="h-3 flex items-center" />
                  <span className="h-3 flex items-center" />
                </div>
                <div className="flex gap-0.5 flex-wrap">
                  {(() => {
                    const maxCount = Math.max(...d.activity_heatmap.map((a) => a.count), 1);
                    return d.activity_heatmap.map((day) => (
                      <HeatmapCell key={day.date} count={day.count} maxCount={maxCount} />
                    ));
                  })()}
                </div>
              </div>

              <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-gray-100" />
                <div className="w-3 h-3 rounded-sm bg-emerald-200" />
                <div className="w-3 h-3 rounded-sm bg-emerald-300" />
                <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span>More</span>
              </div>
            </div>

            {/* Empty state for no data */}
            {d.knowledge_score === 0 && d.learning_hours.total_minutes === 0 && topicMasteries.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-semibold text-gray-700">No data yet</p>
                <p className="text-sm text-gray-400 mt-1">Start reviewing flashcards and taking quizzes to see your adaptive topic mastery.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Topic Detail Drill-down Modal */}
      {selectedTopicId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {selectedTopicDetails?.topic.topic_name || 'Topic Details'}
                </h3>
                <p className="text-xs text-gray-400">
                  {selectedTopicDetails?.topic.description || 'Adaptive Mastery & Practice History'}
                </p>
              </div>
              <button
                onClick={handleCloseTopicModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
              {loadingTopicDetails ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                  <span className="text-xs">Loading topic performance...</span>
                </div>
              ) : selectedTopicDetails ? (
                <>
                  {/* Mastery Score Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-violet-50/70 border border-indigo-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Mastery Score</span>
                      <p className="text-3xl font-black text-gray-900 mt-0.5">
                        {Math.round(selectedTopicDetails.topic.mastery_score)}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedTopicDetails.topic.correct_attempts} of {selectedTopicDetails.topic.total_attempts} attempts correct ({selectedTopicDetails.topic.accuracy_percentage}%)
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        selectedTopicDetails.topic.status === 'weak' ? 'bg-rose-100 text-rose-700' :
                        selectedTopicDetails.topic.status === 'mastered' ? 'bg-emerald-100 text-emerald-700' :
                        selectedTopicDetails.topic.status === 'strong' ? 'bg-sky-100 text-sky-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {selectedTopicDetails.topic.status.toUpperCase()}
                      </span>
                      <p className="text-xs text-gray-500 font-medium mt-1.5">
                        Action: <span className="font-semibold text-indigo-600">{selectedTopicDetails.topic.next_recommended_action}</span>
                      </p>
                    </div>
                  </div>

                  {/* Related Flashcards */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Brain size={13} className="text-amber-500" />
                      <span>Related Flashcards ({selectedTopicDetails.related_flashcards.length})</span>
                    </h4>
                    {selectedTopicDetails.related_flashcards.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">No flashcards directly assigned to this topic yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedTopicDetails.related_flashcards.map((fc) => (
                          <div key={fc.id} className="p-3 rounded-lg border border-gray-100 bg-slate-50/40 text-xs">
                            <p className="font-semibold text-gray-800">{fc.question}</p>
                            <p className="text-gray-500 mt-1">{fc.answer}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                              <span>Difficulty: <strong className="text-gray-600">{fc.difficulty}</strong></span>
                              <span>Reviews: <strong className="text-gray-600">{fc.total_reviews}</strong></span>
                              <span>Accuracy: <strong className="text-gray-600">{fc.total_reviews > 0 ? Math.round((fc.correct_reviews / fc.total_reviews) * 100) : 0}%</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Related Quizzes */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <HelpCircle size={13} className="text-violet-500" />
                      <span>Related Quizzes ({selectedTopicDetails.related_quizzes.length})</span>
                    </h4>
                    {selectedTopicDetails.related_quizzes.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">No quiz questions taken for this topic yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedTopicDetails.related_quizzes.map((q) => (
                          <div key={q.id} className="p-2.5 rounded-lg border border-gray-100 flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-800 truncate">{q.title}</span>
                            <span className="text-gray-500 font-mono text-[11px] flex-shrink-0">
                              {q.score !== null ? `${q.score}/${q.max_score}` : 'In progress'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Performance Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-emerald-500" />
                      <span>Recent Performance History</span>
                    </h4>
                    {selectedTopicDetails.recent_performance.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">No practice history recorded yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTopicDetails.recent_performance.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                              item.is_correct
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}
                          >
                            {item.is_correct ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            <span className="capitalize">{item.item_type}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">
                  Topic information not available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getMonthLabels(heatmap: { date: string }[]): { label: string; span: number }[] {
  const months: { label: string; span: number }[] = [];
  let currentMonth = '';
  let span = 0;
  for (const day of heatmap) {
    const d = new Date(day.date);
    const monthLabel = d.toLocaleString('en-US', { month: 'short' });
    if (monthLabel !== currentMonth) {
      if (currentMonth) months.push({ label: currentMonth, span });
      currentMonth = monthLabel;
      span = 1;
    } else {
      span++;
    }
  }
  if (currentMonth) months.push({ label: currentMonth, span });
  return months;
}

