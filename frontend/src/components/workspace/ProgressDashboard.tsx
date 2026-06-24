import { useEffect } from 'react';
import {
  Loader2, TrendingUp, BarChart3, Clock, Brain, BookOpen,
  Sparkles, Zap, Star, Award,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useProgressStore } from '../../store/useProgressStore';

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
  const { dashboard, weeklyReport, loading, loadingReport, loadDashboard, loadWeeklyReport } = useProgressStore();

  useEffect(() => {
    if (activeWorkspaceId) {
      loadDashboard(activeWorkspaceId);
      loadWeeklyReport(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  if (!activeWorkspaceId) return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const d = dashboard;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Progress Dashboard</h2>
            <p className="text-xs text-gray-400">Your learning analytics at a glance</p>
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

            {/* Learning Hours Breakdown */}
            {d.learning_hours.per_topic.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-indigo-500" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Time by Topic</span>
                </div>
                <div className="space-y-2">
                  {d.learning_hours.per_topic.map((t, i) => {
                    const pct = d.learning_hours.total_minutes > 0
                      ? Math.round((t.minutes / d.learning_hours.total_minutes) * 100)
                      : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-700 truncate">{t.topic}</span>
                          <span className="text-gray-400 font-mono">{t.minutes}m</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state for no data */}
            {d.knowledge_score === 0 && d.learning_hours.total_minutes === 0 && (
              <div className="text-center py-12">
                <BarChart3 size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-semibold text-gray-700">No data yet</p>
                <p className="text-sm text-gray-400 mt-1">Start reviewing flashcards and taking quizzes to see your progress.</p>
              </div>
            )}
          </>
        )}
      </div>
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
