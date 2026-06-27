import { useEffect, useState, useRef } from 'react';
import {
  Plus, MessageSquare, Trash2, Pencil, Check, X,
  FileText, Globe, Upload, Loader2, ExternalLink, AlertCircle,
} from 'lucide-react';
import { useStandaloneChatStore } from '../../store/useStandaloneChatStore';

export function StandaloneSidebarSection() {
  const {
    sessions, activeSessionId, loading, error,
    loadSessions, createSession, setActiveSession, renameSession, deleteSession,
    addSource, removeSource, sources,
  } = useStandaloneChatStore();

  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showAddSource, setShowAddSource] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState<'text' | 'url' | 'file'>('text');
  const [addingSource, setAddingSource] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const session = await createSession(newTitle || undefined);
      setActiveSession(session.id);
      setNewTitle('');
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (id: string) => {
    if (editTitle.trim()) {
      await renameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleAddSource = async () => {
    if (!activeSessionId) return;
    setAddingSource(true);
    try {
      if (sourceType === 'text') {
        await addSource(activeSessionId, 'text', { title: sourceText.slice(0, 50), content: sourceText });
        setSourceText('');
      } else if (sourceType === 'url') {
        await addSource(activeSessionId, 'url', { url: sourceUrl });
        setSourceUrl('');
      }
      setShowAddSource(false);
    } finally {
      setAddingSource(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSessionId) return;
    setAddingSource(true);
    try {
      await addSource(activeSessionId, 'file', { file, title: file.name });
    } finally {
      setAddingSource(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
      <div className="px-3 mb-2 flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Standalone Chats</p>
        <button
          onClick={() => setShowAddSource(false)}
          className="p-1 rounded hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Create new chat */}
      <div className="px-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="New chat..."
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newTitle.trim()}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      {/* Session list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-slate-500" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="px-3 py-6 text-center">
          <MessageSquare size={24} className="mx-auto mb-2 text-slate-600" />
          <p className="text-xs text-slate-500">No chats yet</p>
        </div>
      ) : (
        sessions.map((s) => (
          <div key={s.id} className="group">
            <div
              onClick={() => setActiveSession(s.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                activeSessionId === s.id
                  ? 'bg-indigo-600/20 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {editingId === s.id ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(s.id)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRename(s.id); }}
                    className="p-1 hover:text-green-400"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                    className="p-1 hover:text-rose-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare size={14} className="flex-shrink-0" />
                    <span className="text-xs truncate">{s.title}</span>
                  </div>
                  {activeSessionId === s.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title); }}
                        className="p-1 hover:text-slate-300"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        className="p-1 hover:text-rose-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))
      )}

      {/* Active session sources */}
      {activeSessionId && (
        <div className="border-t border-slate-800/50 pt-3 mt-3">
          <div className="px-3 mb-2 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sources</p>
            <button
              onClick={() => setShowAddSource(!showAddSource)}
              className="p-1 rounded hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {showAddSource && (
            <div className="px-3 mb-3 space-y-2">
              <div className="flex items-center gap-1">
                {(['text', 'url', 'file'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSourceType(t)}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-colors ${
                      sourceType === t
                        ? 'bg-indigo-600/20 text-indigo-400'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    {t === 'text' ? 'Text' : t === 'url' ? 'URL' : 'File'}
                  </button>
                ))}
              </div>

              {sourceType === 'text' && (
                <div className="space-y-1">
                  <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Paste text content..."
                    rows={3}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  <button
                    onClick={handleAddSource}
                    disabled={addingSource || !sourceText.trim()}
                    className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white transition-colors"
                  >
                    {addingSource ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Add Text'}
                  </button>
                </div>
              )}

              {sourceType === 'url' && (
                <div className="space-y-1">
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddSource}
                    disabled={addingSource || !sourceUrl.trim()}
                    className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white transition-colors"
                  >
                    {addingSource ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Fetch URL'}
                  </button>
                </div>
              )}

              {sourceType === 'file' && (
                <div className="space-y-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.pptx,.txt,.md"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600/20 file:text-indigo-400 hover:file:bg-indigo-600/30"
                  />
                </div>
              )}
            </div>
          )}

          {sources.length === 0 ? (
            <div className="px-3 py-3 text-center">
              <p className="text-[10px] text-slate-600">No sources added</p>
            </div>
          ) : (
            sources.map((src) => (
              <div
                key={src.id}
                className="flex items-center justify-between px-3 py-1.5 group/source rounded-lg hover:bg-slate-800/30"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {src.source_type === 'url' ? (
                    <Globe size={12} className="text-sky-400 flex-shrink-0" />
                  ) : src.source_type === 'file' ? (
                    <Upload size={12} className="text-amber-400 flex-shrink-0" />
                  ) : (
                    <FileText size={12} className="text-emerald-400 flex-shrink-0" />
                  )}
                  <span className="text-[11px] text-slate-400 truncate">{src.title}</span>
                </div>
                <button
                  onClick={() => removeSource(activeSessionId, src.id)}
                  className="p-0.5 opacity-0 group-hover/source:opacity-100 hover:text-rose-400 text-slate-600 transition-all"
                >
                  <X size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] text-rose-400 bg-rose-500/10 rounded-lg px-2 py-1.5">
            <AlertCircle size={10} />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
