import { useEffect, useState } from 'react';
import {
  Plus, MessageSquare, Trash2, Pencil, Check, X,
  FileText, Globe, Upload, Loader2, AlertCircle, ArrowRight,
} from 'lucide-react';
import { useStandaloneChatStore } from '../../store/useStandaloneChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { MoveToWorkspaceDialog } from '../modals/MoveToWorkspaceDialog';
import { AddSourceMenu } from '../shared/AddSourceMenu';

export function StandaloneSidebarSection() {
  const {
    sessions, activeSessionId, loading, error,
    loadSessions, setActiveSession, renameSession, deleteSession,
    addSource, removeSource, sources,
  } = useStandaloneChatStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);

  useEffect(() => {
    loadSessions();
  }, []);

  // Hide legacy empty "New Chat" sessions (no messages, no sources) that were
  // auto-created by the previous implementation — but never hide the active one.
  const visibleSessions = sessions.filter(
    (s) =>
      s.id === activeSessionId ||
      !(s.message_count === 0 && s.source_count === 0 && s.title === 'New Chat')
  );

  const handleNewChat = () => {
    // Ephemeral New Chat: clear active UI state only — no database session is created.
    setActiveSession(null);
  };

  const handleRename = async (id: string) => {
    if (editTitle.trim()) {
      await renameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleYouTubeImport = () => {
    if (!activeSessionId) return;
    window.dispatchEvent(new CustomEvent('open-add-video-modal'));
  };

  const handleWebsiteImport = async (url: string) => {
    if (!activeSessionId) return;
    await addSource(activeSessionId, 'url', { url });
  };

  const handleDocumentUpload = async (file: File) => {
    if (!activeSessionId) return;
    await addSource(activeSessionId, 'file', { file, title: file.name });
  };

  const handleMarkdownImport = async (title: string, content: string) => {
    if (!activeSessionId) return;
    await addSource(activeSessionId, 'text', { title, content });
  };

  const handleTextImport = async (title: string, content: string) => {
    if (!activeSessionId) return;
    await addSource(activeSessionId, 'text', { title, content });
  };

  const handleGitHubImport = async (url: string) => {
    if (!activeSessionId) return;
    await addSource(activeSessionId, 'url', { url });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sessions list (scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        <div className="px-3 mb-2">
          <p className="text-[10px] font-medium text-slate-500">Chats</p>
        </div>

        {/* Create new chat (ephemeral — no DB session until first message) */}
        <div className="px-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Plus size={14} />
            <span className="text-xs font-medium">New Chat</span>
          </button>
        </div>

        {/* Session list (persisted conversations only) */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        ) : visibleSessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <MessageSquare size={24} className="mx-auto mb-2 text-slate-600" />
            <p className="text-xs text-slate-500">No chats yet</p>
          </div>
        ) : (
          visibleSessions.map((s) => (
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
                          title="Rename"
                        >
                          <Pencil size={12} />
                        </button>
                        {user && workspaces.length > 0 && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (workspaces.length === 0) await loadWorkspaces();
                              setMovingSessionId(s.id);
                            }}
                            className="p-1 hover:text-sky-400"
                            title="Move to workspace"
                          >
                            <ArrowRight size={12} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                          className="p-1 hover:text-rose-400"
                          title="Delete"
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

      {/* Sources section — always visible at bottom */}
      <div className="flex-shrink-0 border-t border-slate-800/50 p-3 space-y-2">
        <div className="px-3">
          <p className="text-[10px] font-medium text-slate-500">Sources</p>
        </div>

        {!activeSessionId ? (
          <div className="px-3 py-2 text-center">
            <p className="text-[10px] text-slate-600">Select a session to add sources</p>
          </div>
        ) : (
          <>
            {sources.length > 0 && (
              <div className="max-h-[140px] overflow-y-auto space-y-0.5 scrollbar-thin">
                {sources.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center justify-between px-3 py-1.5 group/source rounded-lg hover:bg-slate-800/30"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {src.source_type === 'url' || src.source_type === 'website' ? (
                        <Globe size={12} className="text-sky-400 flex-shrink-0" />
                      ) : src.source_type === 'file' || src.source_type === 'pdf' || src.source_type === 'docx' || src.source_type === 'pptx' ? (
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
                ))}
              </div>
            )}

            <div className="px-1">
              <AddSourceMenu
                onYouTubeImport={handleYouTubeImport}
                onWebsiteImport={handleWebsiteImport}
                onDocumentUpload={handleDocumentUpload}
                onMarkdownImport={handleMarkdownImport}
                onTextImport={handleTextImport}
                onGitHubImport={handleGitHubImport}
                disabled={!activeSessionId}
              />
            </div>
          </>
        )}
      </div>

      {movingSessionId && (
        <MoveToWorkspaceDialog
          sessionId={movingSessionId}
          sessionTitle={sessions.find((s) => s.id === movingSessionId)?.title ?? ''}
          onClose={() => setMovingSessionId(null)}
          onMoved={(wsId) => {
            setMovingSessionId(null);
            useWorkspaceStore.getState().setActiveWorkspace(wsId);
          }}
        />
      )}
    </div>
  );
}
