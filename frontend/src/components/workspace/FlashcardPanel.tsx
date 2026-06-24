import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Loader2, Check, X, Search, ChevronRight, ChevronDown, Brain, Sparkles, Star, Clock, BarChart3 } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { fetchSources, type SourceItem } from '../../api/workspace';
import { DIFFICULTIES } from '../../api/flashcards';
import FlashcardReview from './FlashcardReview';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  hard: 'text-red-600 bg-red-50 border-red-200',
};

export function FlashcardPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const {
    flashcards, reviewQueue, upcomingReviews, stats, loading,
    reviewMode, currentCardIndex,
    loadFlashcards, loadReviewQueue, loadUpcomingReviews, loadStats,
    createFlashcard, generateFlashcards, updateFlashcard, deleteFlashcard,
    setReviewMode, resetReview,
  } = useFlashcardStore();

  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Manual create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newDifficulty, setNewDifficulty] = useState('medium');

  // Generate form
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [generateCount, setGenerateCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  // Edit state
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('medium');

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    review: true,
    upcoming: true,
    cards: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !(prev as any)[key] }));
  };

  useEffect(() => {
    if (activeWorkspaceId) {
      loadFlashcards(activeWorkspaceId);
      loadReviewQueue(activeWorkspaceId);
      loadUpcomingReviews(activeWorkspaceId);
      loadStats(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

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
    if (showGenerateForm && sources.length === 0) {
      loadSources();
    }
  }, [showGenerateForm]);

  // Filtered flashcards
  const filteredCards = flashcards.filter((c) => {
    if (filterDifficulty && c.difficulty !== filterDifficulty) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (!c.question.toLowerCase().includes(q) && !c.answer.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleCreate = async () => {
    if (!activeWorkspaceId || !newQuestion.trim() || !newAnswer.trim()) return;
    await createFlashcard(activeWorkspaceId, newQuestion.trim(), newAnswer.trim(), newDifficulty);
    setNewQuestion('');
    setNewAnswer('');
    setNewDifficulty('medium');
    setShowCreateForm(false);
    loadStats(activeWorkspaceId);
  };

  const handleGenerate = async () => {
    if (!selectedSourceId || generating) return;
    setGenerating(true);
    try {
      await generateFlashcards(selectedSourceId, generateCount);
      setShowGenerateForm(false);
      setSelectedSourceId('');
      if (activeWorkspaceId) {
        loadStats(activeWorkspaceId);
        loadReviewQueue(activeWorkspaceId);
      }
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  const handleStartReview = () => {
    setReviewMode(true);
  };

  const handleReviewComplete = () => {
    resetReview();
    if (activeWorkspaceId) {
      loadReviewQueue(activeWorkspaceId);
      loadUpcomingReviews(activeWorkspaceId);
      loadStats(activeWorkspaceId);
    }
  };

  const handleEdit = (card: any) => {
    setEditingCardId(card.id);
    setEditQuestion(card.question);
    setEditAnswer(card.answer);
    setEditDifficulty(card.difficulty);
  };

  const handleSaveEdit = async () => {
    if (!editingCardId) return;
    await updateFlashcard(editingCardId, {
      question: editQuestion,
      answer: editAnswer,
      difficulty: editDifficulty,
    });
    setEditingCardId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteFlashcard(id);
    if (activeWorkspaceId) loadStats(activeWorkspaceId);
  };

  if (!activeWorkspaceId) return null;

  // Flashcard Review Mode
  if (reviewMode) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
        <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Brain size={16} className="text-indigo-400" />
            Reviewing Flashcards
          </h2>
          <button
            onClick={handleReviewComplete}
            className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <X size={14} className="inline mr-1" />Exit
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <FlashcardReview cards={reviewQueue} onComplete={handleReviewComplete} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Stats Section */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('stats')}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            {expandedSections.stats ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <BarChart3 size={14} className="text-indigo-500" />
            Overview
          </button>
          {expandedSections.stats && (
            <div className="px-4 pb-4">
              {stats ? (
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-indigo-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
                    <p className="text-[10px] text-indigo-500 font-medium uppercase tracking-wider mt-1">Total</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.due_today}</p>
                    <p className="text-[10px] text-amber-500 font-medium uppercase tracking-wider mt-1">Due Today</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{stats.reviewed_today}</p>
                    <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider mt-1">Reviewed</p>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-violet-600">{Math.round(stats.retention_rate * 100)}%</p>
                    <p className="text-[10px] text-violet-500 font-medium uppercase tracking-wider mt-1">Retention</p>
                  </div>
                </div>
              ) : loading ? (
                <div className="flex justify-center py-3">
                  <Loader2 size={14} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-3">No data yet</p>
              )}
            </div>
          )}
        </div>

        {/* Review Queue Section */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('review')}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            {expandedSections.review ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Clock size={14} className="text-amber-500" />
            Due for Review
            {reviewQueue.length > 0 && (
              <span className="ml-auto text-xs font-mono bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {reviewQueue.length}
              </span>
            )}
          </button>
          {expandedSections.review && (
            <div className="px-4 pb-4">
              {reviewQueue.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No cards due! Add more flashcards or check upcoming.</p>
              ) : (
                <div>
                  <div className="text-xs text-gray-500 mb-2">
                    {reviewQueue.length} card{reviewQueue.length > 1 ? 's' : ''} waiting for review
                  </div>
                  <button
                    onClick={handleStartReview}
                    className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Brain size={14} />
                    Start Review ({reviewQueue.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upcoming Reviews Section */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('upcoming')}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            {expandedSections.upcoming ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Star size={14} className="text-violet-500" />
            Upcoming (7 days)
            {upcomingReviews.length > 0 && (
              <span className="ml-auto text-xs font-mono bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                {upcomingReviews.length}
              </span>
            )}
          </button>
          {expandedSections.upcoming && (
            <div className="px-4 pb-4">
              {upcomingReviews.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No upcoming reviews</p>
              ) : (
                <div className="space-y-1.5">
                  {upcomingReviews.map((card) => (
                    <div key={card.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs">
                      <span className="flex-1 truncate text-gray-700">{card.question}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLORS[card.difficulty] || DIFFICULTY_COLORS.medium}`}>
                        {card.difficulty}
                      </span>
                      {card.next_review_date && (
                        <span className="text-[10px] text-gray-400">
                          {new Date(card.next_review_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowCreateForm(true); setShowGenerateForm(false); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
          >
            <Plus size={12} />
            Add Card
          </button>
          <button
            onClick={() => { setShowGenerateForm(true); setShowCreateForm(false); loadSources(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all"
          >
            <Sparkles size={12} />
            Generate from Source
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white border border-indigo-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-700">New Flashcard</h3>
            <input
              autoFocus
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Question"
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Answer"
              rows={3}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none"
            />
            <div className="flex items-center gap-2">
              <select
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="flex-1" />
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newQuestion.trim() || !newAnswer.trim()}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Plus size={11} />
                Create
              </button>
            </div>
          </div>
        )}

        {/* Generate Form */}
        {showGenerateForm && (
          <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-700">Generate Flashcards from Source</h3>
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
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Count:</label>
              <input
                type="number"
                min={3}
                max={50}
                value={generateCount}
                onChange={(e) => setGenerateCount(parseInt(e.target.value) || 10)}
                className="w-16 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-emerald-400"
              />
              <div className="flex-1" />
              <button
                onClick={() => { setShowGenerateForm(false); setSelectedSourceId(''); }}
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

        {/* Filter & Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search flashcards..."
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-2.5 py-1.5 outline-none focus:border-indigo-400"
            />
          </div>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400"
          >
            <option value="">All</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Flashcard List */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('cards')}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            {expandedSections.cards ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Brain size={14} className="text-indigo-500" />
            All Flashcards
            {flashcards.length > 0 && (
              <span className="text-xs font-mono text-gray-400 ml-1">({flashcards.length})</span>
            )}
          </button>
          {expandedSections.cards && (
            <div className="px-4 pb-4 space-y-2">
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                </div>
              ) : filteredCards.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  {flashcards.length === 0 ? 'No flashcards yet. Add or generate some!' : 'No matches for your filter.'}
                </p>
              ) : (
                filteredCards.map((card) => (
                  <div
                    key={card.id}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      editingCardId === card.id ? 'border-indigo-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {editingCardId === card.id ? (
                      <div className="p-3 space-y-2">
                        <input
                          autoFocus
                          value={editQuestion}
                          onChange={(e) => setEditQuestion(e.target.value)}
                          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
                        />
                        <textarea
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                          rows={3}
                          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <select
                            value={editDifficulty}
                            onChange={(e) => setEditDifficulty(e.target.value)}
                            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400"
                          >
                            {DIFFICULTIES.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                          <div className="flex-1" />
                          <button
                            onClick={() => setEditingCardId(null)}
                            className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                          >
                            <Check size={11} /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="p-3 cursor-pointer"
                        onClick={() => handleEdit(card)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 mb-1">{card.question}</p>
                            <p className="text-xs text-gray-500 line-clamp-2">{card.answer}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(card.id);
                            }}
                            className="p-0.5 flex-shrink-0 text-gray-400 hover:text-rose-500 transition-all"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLORS[card.difficulty] || DIFFICULTY_COLORS.medium}`}>
                            {card.difficulty}
                          </span>
                          {card.total_reviews > 0 && (
                            <span className="text-[10px] text-gray-400">
                              Reviewed {card.total_reviews}x · {Math.round((card.correct_reviews / card.total_reviews) * 100)}% correct
                            </span>
                          )}
                          {card.next_review_date && (
                            <span className="text-[10px] text-gray-400">
                              Next: {new Date(card.next_review_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {new Date(card.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
