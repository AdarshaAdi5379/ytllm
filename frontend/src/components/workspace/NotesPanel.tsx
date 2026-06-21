import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Trash2, Loader2, Check, X, Book, Tag, Star, Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useNoteStore } from '../../store/useNoteStore';
import { analyzeNote, type NoteAnalysis } from '../../api/notes';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'text-green-500 bg-green-50 border-green-200',
  intermediate: 'text-amber-500 bg-amber-50 border-amber-200',
  advanced: 'text-rose-500 bg-rose-50 border-rose-200',
};

export function NotesPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { notes, loading, editingNoteId, loadNotes, createNote, updateNote, deleteNote, setEditingNoteId } = useNoteStore();

  const [newContent, setNewContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('intermediate');
  const [editImportance, setEditImportance] = useState(3);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<NoteAnalysis | null>(null);
  const [analysisApplied, setAnalysisApplied] = useState(false);
  const analysisTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadNotes(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (editingNoteId) {
      const note = notes.find((n) => n.id === editingNoteId);
      if (note) {
        setEditContent(note.content);
        setEditTopic(note.topic);
        setEditDifficulty(note.difficulty);
        setEditImportance(note.importance);
      }
    }
  }, [editingNoteId, notes]);

  // Auto-analyze as user types (debounced)
  const handleContentChange = useCallback((content: string) => {
    setNewContent(content);
    if (analysisTimer.current) clearTimeout(analysisTimer.current);
    setAnalysis(null);
    setAnalysisApplied(false);

    if (content.trim().length < 20) return;
    analysisTimer.current = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const result = await analyzeNote(content);
        setAnalysis(result);
      } catch {
        // silent
      } finally {
        setAnalyzing(false);
      }
    }, 800);
  }, []);

  const applyAnalysis = () => {
    if (!analysis) return;
    setEditTopic(analysis.topic);
    setEditDifficulty(analysis.difficulty);
    setEditImportance(analysis.importance);
    setAnalysisApplied(true);
    setAnalysis(null);
  };

  const handleCreate = async () => {
    if (!activeWorkspaceId || !newContent.trim()) return;
    await createNote(activeWorkspaceId, newContent.trim());
    setNewContent('');
    setAnalysis(null);
    setAnalysisApplied(false);
  };

  const handleUpdate = async (noteId: string) => {
    await updateNote(noteId, {
      content: editContent,
      topic: editTopic || undefined,
      difficulty: editDifficulty,
      importance: editImportance,
    });
    setEditingNoteId(null);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
  };

  if (!activeWorkspaceId) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {/* New note input */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
          <textarea
            autoFocus
            value={newContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Write a new note..."
            rows={3}
            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none"
          />

          {/* AI Analysis suggestion */}
          {analyzing && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-500">
              <Loader2 size={10} className="animate-spin" />
              Analyzing...
            </div>
          )}
          {analysis && !analysisApplied && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600">
                  <Sparkles size={10} />
                  AI Suggestions
                </div>
                <button
                  onClick={applyAnalysis}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-all"
                >
                  Apply
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full font-medium">
                  {analysis.topic}
                </span>
                {analysis.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                  analysis.difficulty === 'beginner' ? 'text-green-600 bg-green-50 border-green-200' :
                  analysis.difficulty === 'advanced' ? 'text-rose-600 bg-rose-50 border-rose-200' :
                  'text-amber-600 bg-amber-50 border-amber-200'
                }`}>
                  {analysis.difficulty}
                </span>
                <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                  <Star size={8} fill="currentColor" />
                  {analysis.importance}/5
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => { setNewContent(''); setAnalysis(null); setAnalysisApplied(false); }}
              className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <X size={12} className="inline mr-1" />Clear
            </button>
            <button
              onClick={handleCreate}
              disabled={!newContent.trim()}
              className="px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Plus size={11} />
              Add Note
            </button>
          </div>
        </div>

        {/* Note list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={16} className="animate-spin text-gray-400" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={`bg-white border rounded-xl overflow-hidden transition-all ${
                editingNoteId === note.id ? 'border-indigo-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {editingNoteId === note.id ? (
                /* Edit mode */
                <div className="p-3 space-y-2">
                  <textarea
                    autoFocus
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={5}
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      value={editTopic}
                      onChange={(e) => setEditTopic(e.target.value)}
                      placeholder="Topic"
                      className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400"
                    />
                    <select
                      value={editDifficulty}
                      onChange={(e) => setEditDifficulty(e.target.value)}
                      className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400"
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() => setEditImportance(s)}
                          className={`p-0.5 ${s <= editImportance ? 'text-amber-400' : 'text-gray-300'}`}
                        >
                          <Star size={10} fill={s <= editImportance ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={handleCancelEdit} className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700">
                      <X size={12} className="inline mr-1" />Cancel
                    </button>
                    <button onClick={() => handleUpdate(note.id)} className="px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1">
                      <Check size={11} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => setEditingNoteId(note.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {note.content}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="p-0.5 flex-shrink-0 text-gray-400 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {note.topic && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                        <Tag size={8} />{note.topic}
                      </span>
                    )}
                    {/* Tags */}
                    {(() => {
                      let tags: string[] = [];
                      try { tags = JSON.parse(note.tags); } catch { tags = []; }
                      return tags.map((tag, i) => (
                        <span key={i} className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ));
                    })()}
                    <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLORS[note.difficulty] || DIFFICULTY_COLORS.intermediate}`}>
                      {note.difficulty}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                      <Star size={8} fill="currentColor" className="text-amber-400" />
                      {note.importance}/5
                    </span>
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
