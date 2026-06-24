import { useEffect, useState } from 'react';
import {
  Plus, Trash2, Loader2, Sparkles, ChevronRight, ChevronDown,
  BarChart3, CheckCircle, Circle, Clock, BookOpen, ArrowLeft,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useLearningPathStore } from '../../store/useLearningPathStore';

export function LearningPathPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { paths, activePath, loading, generating, loadPaths, generatePath, setActivePath, markTopicComplete, deletePath } = useLearningPathStore();

  const [showGenerate, setShowGenerate] = useState(false);
  const [pathTitle, setPathTitle] = useState('');
  const [focusArea, setFocusArea] = useState('');

  useEffect(() => {
    if (activeWorkspaceId) {
      loadPaths(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const handleGenerate = async () => {
    if (!activeWorkspaceId || generating) return;
    try {
      await generatePath(activeWorkspaceId, pathTitle || undefined, focusArea || undefined);
      setShowGenerate(false);
      setPathTitle('');
      setFocusArea('');
    } catch {
      // silent
    }
  };

  const handleToggleComplete = async (topicId: string, currentCompleted: number) => {
    if (!activePath) return;
    await markTopicComplete(activePath.id, topicId, !currentCompleted);
  };

  // Detail view for a single path
  if (activePath) {
    const pct = activePath.total_topics > 0
      ? Math.round((activePath.completed_topics / activePath.total_topics) * 100)
      : 0;

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-2 px-6 py-3 border-b border-gray-100">
          <button
            onClick={() => setActivePath(null)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-800 truncate">{activePath.title}</h2>
            <p className="text-[10px] text-gray-400">{activePath.completed_topics}/{activePath.total_topics} topics completed</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            activePath.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
            activePath.status === 'archived' ? 'bg-gray-100 text-gray-500' :
            'bg-indigo-100 text-indigo-700'
          }`}>
            {activePath.status}
          </span>
          <button
            onClick={() => deletePath(activePath.id)}
            className="p-1.5 text-gray-400 hover:text-rose-500 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Description */}
            {activePath.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{activePath.description}</p>
            )}

            {/* Overall progress */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">Overall Progress</span>
                <span className="text-xs font-bold text-indigo-600">{pct}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
                <span>{activePath.completed_topics} of {activePath.total_topics} topics</span>
                {activePath.time_spent_minutes > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {activePath.time_spent_minutes}m spent
                  </span>
                )}
              </div>
            </div>

            {/* Topics */}
            <div className="space-y-1.5">
              {activePath.topics
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((topic, i) => (
                  <div
                    key={topic.id}
                    className={`bg-white border rounded-xl overflow-hidden transition-all ${
                      topic.completed
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-3 flex items-start gap-3">
                      <button
                        onClick={() => handleToggleComplete(topic.id, topic.completed)}
                        className={`mt-0.5 flex-shrink-0 transition-all ${
                          topic.completed
                            ? 'text-emerald-500'
                            : 'text-gray-300 hover:text-gray-400'
                        }`}
                      >
                        {topic.completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold text-gray-400">Topic {i + 1}</span>
                          {topic.completed_at && (
                            <span className="text-[10px] text-emerald-500">
                              Completed {new Date(topic.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm font-medium ${topic.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                          {topic.title}
                        </p>
                        {topic.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{topic.description}</p>
                        )}
                        {topic.time_spent_minutes > 0 && (
                          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                            <Clock size={9} />
                            {topic.time_spent_minutes} min
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`text-[10px] font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                          topic.completed
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {i + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Stats */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-indigo-600">{paths.length}</p>
              <p className="text-[10px] text-indigo-500 font-medium uppercase tracking-wider mt-1">Paths</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {paths.filter((p) => p.status === 'completed').length}
              </p>
              <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider mt-1">Completed</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {paths.reduce((acc, p) => acc + p.completed_topics, 0)}
              </p>
              <p className="text-[10px] text-amber-500 font-medium uppercase tracking-wider mt-1">Done Topics</p>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={() => setShowGenerate(!showGenerate)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
        >
          <Sparkles size={12} />
          Generate Learning Path
        </button>

        {/* Generate form */}
        {showGenerate && (
          <div className="bg-white border border-indigo-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-700">Generate from Workspace Sources</h3>
            <p className="text-[10px] text-gray-400">AI will analyze all sources in your workspace and create a structured learning roadmap.</p>
            <input
              value={pathTitle}
              onChange={(e) => setPathTitle(e.target.value)}
              placeholder="Learning path title (optional)"
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
            <textarea
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="Focus area (optional) — e.g. 'Python web development' or 'Machine Learning fundamentals'"
              rows={2}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowGenerate(false)}
                className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
              >
                {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        )}

        {/* Path list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={16} className="animate-spin text-gray-400" />
          </div>
        ) : paths.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium">No learning paths yet</p>
            <p className="text-xs text-gray-400 mt-1">Generate a path to get a personalized learning roadmap</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paths.map((p) => {
              const pct = p.total_topics > 0 ? Math.round((p.completed_topics / p.total_topics) * 100) : 0;
              return (
                <div
                  key={p.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 cursor-pointer transition-all"
                  onClick={() => setActivePath(p)}
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === 'archived' ? 'bg-gray-100 text-gray-500' :
                            'bg-indigo-100 text-indigo-700'
                          }`}>
                            {p.status}
                          </span>
                          <span className="text-[10px] text-gray-400">{p.total_topics} topics</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.title}</p>
                        {p.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>
                        )}
                      </div>
                      <ChevronRight size={14} className="text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-gray-500">{pct}%</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                      <span>{p.completed_topics}/{p.total_topics} done</span>
                      {p.time_spent_minutes > 0 && <span>{p.time_spent_minutes}m spent</span>}
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
