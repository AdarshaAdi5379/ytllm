import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Send, Loader2, MessageSquare, Trash2, Plus,
  User, Bot, Sparkles, AlertCircle,
} from 'lucide-react';
import { useStandaloneChatStore } from '../../store/useStandaloneChatStore';
import { streamStandaloneChat, type StandaloneChatMessage } from '../../api/standalone';

export function StandaloneChatPanel() {
  const {
    activeSessionId, messages, streaming, loading, error,
    setActiveSession, createSession, addMessage, setStreaming, clearMessage,
  } = useStandaloneChatStore();

  const [input, setInput] = useState('');
  const [streamText, setStreamText] = useState('');
  const streamTextRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  // Auto-create first session
  useEffect(() => {
    if (!activeSessionId && !loading) {
      createSession('New Chat').then((s) => setActiveSession(s.id)).catch(() => {});
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming || !activeSessionId) return;
    const question = input.trim();
    setInput('');
    setStreamText('');

    const userMsg = { role: 'user' as const, content: question, timestamp: new Date().toISOString() };
    addMessage(userMsg);
    setStreaming(true);

    const history = [...messages.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp })), userMsg];

    abortRef.current = streamStandaloneChat(activeSessionId, {
      question,
      chat_history: history,
    }, {
      onToken: (text) => {
        streamTextRef.current += text;
        setStreamText(streamTextRef.current);
      },
      onError: (msg) => {
        setStreamText(`Error: ${msg}`);
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
  }, [input, streaming, activeSessionId, messages, addMessage, setStreaming, streamText]);

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

  const handleNewChat = async () => {
    if (streaming) handleStop();
    const session = await createSession('New Chat');
    setActiveSession(session.id);
  };

  const handleClear = () => {
    if (streaming) handleStop();
    clearMessage();
  };

  if (!activeSessionId) {
    return (
      <main className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 size={24} className="animate-spin text-slate-400 mx-auto" />
          <p className="text-sm text-slate-500 mt-2">Creating session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-600" />
          <span className="text-sm font-bold text-gray-800">Standalone Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            <Plus size={14} />
            New Chat
          </button>
          <button
            onClick={handleClear}
            disabled={messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 rounded-lg transition-all"
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
            <div className="text-center max-w-md px-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                <MessageSquare size={22} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Ask anything</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your sources will be searched for relevant context to answer your questions.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-4 px-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-md'
                      : 'bg-gray-100 text-gray-800 rounded-tl-md'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))}

            {streaming && streamText && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-gray-100 text-gray-800 rounded-tl-md">
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
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 p-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
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
                className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl transition-all"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-all"
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
