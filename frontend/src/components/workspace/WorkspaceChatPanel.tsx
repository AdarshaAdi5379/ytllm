import { useEffect, useState, useRef } from 'react';
import { Send, Loader2, MessageSquare, Plus, Trash2, ChevronRight, X, Youtube, FolderOpen, SlidersHorizontal, Book, Search, ExternalLink, Sparkles, Brain, BookOpen, Zap, BarChart3, GraduationCap } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useChatSessionStore } from '../../store/useChatSessionStore';
import { streamWorkspaceChat, type ChatSessionItem } from '../../api/workspace';
import { useAuthStore } from '../../store/useAuthStore';
import { NotesPanel } from './NotesPanel';
import { SearchPanel } from './SearchPanel';
import { SummaryPanel } from './SummaryPanel';
import { ActionsToolbar } from './ActionsToolbar';
import { FlashcardPanel } from './FlashcardPanel';
import { QuizPanel } from './QuizPanel';
import { LearningPathPanel } from './LearningPathPanel';
import { DailyRevisionPanel } from './DailyRevisionPanel';
import { ProgressDashboardPanel } from './ProgressDashboard';
import { MentorPanel } from './MentorPanel';

export function WorkspaceChatPanel() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const {
    sessions, activeSessionId, messages, streaming,
    loadSessions, setActiveSession, deleteSessionFromStore, addMessage, setStreaming,
  } = useChatSessionStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [input, setInput] = useState('');
  const [showSessions, setShowSessions] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [citationsMap, setCitationsMap] = useState<Record<number, any[]>>({});
  const [viewMode, setViewMode] = useState<'chat' | 'notes' | 'search' | 'summary' | 'flashcard' | 'quiz' | 'path' | 'revision' | 'progress' | 'mentor'>('chat');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedTemperature, setSelectedTemperature] = useState(0.2);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const AVAILABLE_MODELS = [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'o1-mini',
    'o1-preview',
  ];

  useEffect(() => {
    if (activeWorkspaceId && isAuthenticated) {
      loadSessions(activeWorkspaceId);
    }
  }, [activeWorkspaceId, isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeWorkspaceId || streaming) return;
    const question = input.trim();
    setInput('');

    const userMsg = { role: 'user' as const, content: question, timestamp: new Date().toISOString() };
    addMessage(userMsg);
    setStreaming(true);

    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));

    streamWorkspaceChat(
      activeWorkspaceId,
      {
        session_id: activeSessionId || undefined,
        question,
        chat_history: history,
        model: selectedModel || undefined,
        temperature: selectedTemperature,
      },
      (token) => {
        // Accumulate token into the last assistant message
        const { messages: msgs } = useChatSessionStore.getState();
        const last = msgs[msgs.length - 1];
        if (last && last.role === 'assistant') {
          useChatSessionStore.setState({
            messages: [...msgs.slice(0, -1), { ...last, content: last.content + token }],
          });
        } else {
          addMessage({ role: 'assistant', content: token, timestamp: new Date().toISOString() });
        }
      },
      (meta) => {
        // Meta event — refresh sessions (new session_id may have been created)
        if (activeWorkspaceId) {
          loadSessions(activeWorkspaceId);
        }
      },
      (error) => {
        addMessage({ role: 'assistant', content: `Error: ${error}`, timestamp: new Date().toISOString() });
        setStreaming(false);
      },
      () => {
        setStreaming(false);
        if (activeWorkspaceId) {
          loadSessions(activeWorkspaceId);
        }
      },
      (citations) => {
        const { messages: msgs } = useChatSessionStore.getState();
        const assistantIdx = msgs.length - 1;
        setCitationsMap((prev) => ({ ...prev, [assistantIdx]: citations }));
      },
    );
  };

  const handleNewChat = async () => {
    if (!activeWorkspaceId) return;
    const session = await useChatSessionStore.getState().createSession(
      activeWorkspaceId, undefined, undefined,
      selectedModel || undefined, selectedTemperature,
    );
    await setActiveSession(activeWorkspaceId, session.id);
  };

  const handleSelectSession = async (s: ChatSessionItem) => {
    if (!activeWorkspaceId) return;
    await setActiveSession(activeWorkspaceId, s.id);
    if (s.model) setSelectedModel(s.model);
    if (s.temperature != null) setSelectedTemperature(s.temperature);
    setShowSessions(false);
  };

  if (!isAuthenticated || !activeWorkspaceId) return null;

  return (
    <main className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Top bar with session selector + settings */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            <MessageSquare size={14} />
            <span>Chats</span>
            <ChevronRight size={12} className={`transition-transform ${showSessions ? 'rotate-90' : ''}`} />
          </button>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
          >
            <Plus size={12} />
            New Chat
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <button
            onClick={() => setViewMode('chat')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'chat' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MessageSquare size={12} />
            Chat
          </button>
          <button
            onClick={() => setViewMode('notes')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'notes' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Book size={12} />
            Notes
          </button>
          <button
            onClick={() => setViewMode('search')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'search' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Search size={12} />
            Search
          </button>
          <button
            onClick={() => setViewMode('summary')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'summary' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Sparkles size={12} />
            Summaries
          </button>
          <button
            onClick={() => setViewMode('flashcard')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'flashcard' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Brain size={12} />
            Flashcards
          </button>
          <button
            onClick={() => setViewMode('quiz')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'quiz' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Brain size={12} />
            Quizzes
          </button>
          <button
            onClick={() => setViewMode('path')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'path' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BookOpen size={12} />
            Learning Path
          </button>
          <button
            onClick={() => setViewMode('revision')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'revision' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Zap size={12} />
            Daily Revision
          </button>
          <button
            onClick={() => setViewMode('mentor')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'mentor' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <GraduationCap size={12} />
            Mentor
          </button>
          <button
            onClick={() => setViewMode('progress')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'progress' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart3 size={12} />
            Progress
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ActionsToolbar />
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              title="Chat settings"
            >
              <SlidersHorizontal size={13} />
            </button>
          {showSettings && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50 space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                >
                  <option value="">Default ({AVAILABLE_MODELS[0]})</option>
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1.5">
                  Temperature: {selectedTemperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={selectedTemperature}
                  onChange={(e) => setSelectedTemperature(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>Precise (0)</span>
                  <span>Creative (2)</span>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Session sidebar */}
        {showSessions && (
          <div className="w-56 flex-shrink-0 border-r border-gray-100 bg-gray-50/50 overflow-y-auto p-2">
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No chats yet</p>
            ) : (
              <div className="space-y-0.5">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                      s.id === activeSessionId
                        ? 'bg-indigo-100 text-indigo-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSelectSession(s)}
                  >
                    <MessageSquare size={10} className="flex-shrink-0" />
                    <span className="flex-1 truncate">{s.title}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{s.message_count}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeWorkspaceId) deleteSessionFromStore(activeWorkspaceId, s.id);
                      }}
                      className="p-0.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === 'notes' ? (
          <NotesPanel />
        ) : viewMode === 'search' ? (
          <SearchPanel />
        ) : viewMode === 'summary' ? (
          <SummaryPanel />
        ) : viewMode === 'flashcard' ? (
          <FlashcardPanel />
        ) : viewMode === 'quiz' ? (
          <QuizPanel />
        ) : viewMode === 'path' ? (
          <LearningPathPanel />
        ) : viewMode === 'revision' ? (
          <DailyRevisionPanel />
        ) : viewMode === 'mentor' ? (
          <MentorPanel />
        ) : viewMode === 'progress' ? (
          <ProgressDashboardPanel />
        ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <>
                    <MessageSquare size={32} className="mx-auto text-gray-300 mb-3" />
                    <h2 className="text-lg font-semibold text-gray-700 mb-1">Workspace Chat</h2>
                    <p className="text-sm text-gray-400">
                      Ask questions about all sources in this workspace.
                    </p>
                  </>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i}>
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                  {msg.role === 'assistant' && citationsMap[i] && citationsMap[i].length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-1.5 ml-2">
                      {citationsMap[i].map((c: any, ci: number) => (
                        <span
                          key={ci}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-all"
                          title={`Source: ${c.title} (${c.source_type})`}
                        >
                          {c.title}
                          {c.url && (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-0.5 text-indigo-400 hover:text-indigo-700"
                              title="Open source"
                            >
                              <ExternalLink size={8} />
                            </a>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-gradient-to-t from-white via-white to-transparent">
            <div className="flex items-center gap-2 max-w-4xl mx-auto">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about your sources..."
                disabled={streaming}
                className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={streaming || !input.trim()}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </main>
  );
}
