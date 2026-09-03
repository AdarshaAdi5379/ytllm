import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Send, Loader2, MessageSquare, Trash2, Plus,
  User, Bot, Sparkles, AlertCircle, Paperclip, X, Menu,
} from 'lucide-react';
import { useStandaloneChatStore } from '../../store/useStandaloneChatStore';
import { streamStandaloneChat } from '../../api/standalone';
import { useAppStore } from '../../store/useAppStore';

export function StandaloneChatPanel() {
  const {
    activeSessionId, messages, streaming, loading, error,
    setActiveSession, ensureSession, addMessage, setStreaming, clearMessage,
    updateSessionTitle, addSource,
  } = useStandaloneChatStore();

  const [input, setInput] = useState('');
  const [streamText, setStreamText] = useState('');
  const streamTextRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachType, setAttachType] = useState<'text' | 'url' | 'file'>('text');
  const [attachText, setAttachText] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [addingSource, setAddingSource] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachFileRef = useRef<HTMLInputElement>(null);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  // No auto-create: with no active session we show an ephemeral "New Chat" state.
  // A real session is only created lazily on the first message (see handleSend).

  useEffect(() => {
    if (!showAttachMenu) return;
    const handler = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAttachMenu]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const question = input.trim();
    setInput('');
    setStreamText('');

    // Lazily create the real session on the first message of an ephemeral New Chat.
    // ensureSession is idempotent and race-safe (shares a single creation promise).
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await ensureSession();
        sessionId = session.id;
      } catch (err: any) {
        addMessage({ role: 'assistant', content: `Error: ${err.message || 'Failed to create session'}`, timestamp: new Date().toISOString() });
        return;
      }
    }

    const userMsg = { role: 'user' as const, content: question, timestamp: new Date().toISOString() };
    addMessage(userMsg);
    setStreaming(true);

    const history = [...messages.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp })), userMsg];
    const createdSessionId = sessionId;

    abortRef.current = streamStandaloneChat(createdSessionId, {
      question,
      chat_history: history,
    }, {
      onToken: (text) => {
        streamTextRef.current += text;
        setStreamText(streamTextRef.current);
      },
      onTitle: (title) => {
        updateSessionTitle(createdSessionId, title);
      },
      onError: (msg) => {
        streamTextRef.current = '';
        addMessage({ role: 'assistant', content: `Error: ${msg}`, timestamp: new Date().toISOString() });
        setStreamText('');
        setStreaming(false);
      },
      onDone: () => {
        const fullText = streamTextRef.current;
        streamTextRef.current = '';
        addMessage({ role: 'assistant', content: fullText, timestamp: new Date().toISOString() });
        setStreamText('');
        setStreaming(false);
      },
    });
  }, [input, streaming, activeSessionId, messages, addMessage, setStreaming, ensureSession, updateSessionTitle]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleNewChat = () => {
    if (streaming) handleStop();
    // Ephemeral New Chat: clear active UI state only — no database session is created.
    setActiveSession(null);
  };

  const handleClear = () => {
    if (streaming) handleStop();
    clearMessage();
  };

  const handleAttachSource = async () => {
    if (!activeSessionId) return;
    setAddingSource(true);
    try {
      if (attachType === 'text' && attachText.trim()) {
        await addSource(activeSessionId, 'text', { title: 'Attached Text', content: attachText.trim() });
        setAttachText('');
      } else if (attachType === 'url' && attachUrl.trim()) {
        await addSource(activeSessionId, 'url', { url: attachUrl.trim() });
        setAttachUrl('');
      }
      setShowAttachMenu(false);
    } catch {
      // handled by store
    } finally {
      setAddingSource(false);
    }
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSessionId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setAddingSource(true);
    try {
      await addSource(activeSessionId, 'file', { file, title: file.name });
      setShowAttachMenu(false);
    } catch {
      // handled by store
    } finally {
      setAddingSource(false);
      if (attachFileRef.current) attachFileRef.current.value = '';
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between pr-4 py-3 lg:pl-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <Sparkles size={18} className="text-indigo-600" />
          <span className="text-sm font-bold text-gray-800">{activeSessionId ? 'Standalone Chat' : 'New Chat'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all min-h-[44px]"
          >
            <Plus size={14} />
            New Chat
          </button>
          <button
            onClick={handleClear}
            disabled={messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 rounded-lg transition-all min-h-[44px]"
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 && !streaming ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-6 lg:pl-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={22} className="text-indigo-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Ask anything</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Add a source in the sidebar below and start asking questions.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-4 px-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-indigo-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed break-words ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-md'
                      : 'bg-gray-100 text-gray-800 rounded-tl-md'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-slate-600" />
                  </div>
                )}
              </div>
            ))}

            {streaming && streamText && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-indigo-600" />
                </div>
                <div className="max-w-[80%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed bg-gray-100 text-gray-800 rounded-tl-md break-words">
                  {streamText}
                  <span className="inline-block w-1.5 h-4 bg-indigo-600 animate-pulse ml-0.5 rounded-sm" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
            <AlertCircle size={14} />
            {error}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white relative">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 p-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            {/* Attach button */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                disabled={streaming || !activeSessionId}
                className={`p-2.5 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  showAttachMenu
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                } disabled:opacity-30`}
                title="Attach source"
              >
                <Paperclip size={18} />
              </button>

              {showAttachMenu && (
                <div
                  ref={attachMenuRef}
                  className="absolute bottom-full left-0 mb-2 w-64 sm:w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-3"
                >
                  <div className="flex items-center gap-1 mb-3">
                    {(['text', 'url', 'file'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setAttachType(t)}
                        className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded-lg transition-colors ${
                          attachType === t
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {t === 'text' ? 'Text' : t === 'url' ? 'URL' : 'File'}
                      </button>
                    ))}
                  </div>

                  {attachType === 'text' && (
                    <div className="space-y-2">
                      <textarea
                        value={attachText}
                        onChange={(e) => setAttachText(e.target.value)}
                        placeholder="Paste text content..."
                        rows={3}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 resize-none"
                      />
                      <button
                        onClick={handleAttachSource}
                        disabled={addingSource || !attachText.trim()}
                        className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 text-xs font-bold text-white transition-colors"
                      >
                        {addingSource ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Add Text'}
                      </button>
                    </div>
                  )}

                  {attachType === 'url' && (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={attachUrl}
                        onChange={(e) => setAttachUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400"
                      />
                      <button
                        onClick={handleAttachSource}
                        disabled={addingSource || !attachUrl.trim()}
                        className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 text-xs font-bold text-white transition-colors"
                      >
                        {addingSource ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Fetch URL'}
                      </button>
                    </div>
                  )}

                  {attachType === 'file' && (
                    <div className="space-y-2">
                      <input
                        ref={attachFileRef}
                        type="file"
                        accept=".pdf,.docx,.pptx,.txt,.md"
                        onChange={handleAttachFile}
                        disabled={addingSource}
                        className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                      />
                      {addingSource && (
                        <div className="flex items-center justify-center py-1">
                          <Loader2 size={14} className="animate-spin text-indigo-600" />
                          <span className="text-xs text-gray-500 ml-2">Uploading...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              disabled={streaming}
              className="flex-1 bg-transparent resize-none px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none max-h-32"
              style={{ minHeight: '40px' }}
            />
            {streaming ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl transition-all"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-all"
              >
                <Send size={16} />
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
