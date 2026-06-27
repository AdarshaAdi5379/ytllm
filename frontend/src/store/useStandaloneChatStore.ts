import { create } from 'zustand';
import * as standaloneApi from '../api/standalone';
import { getGuestToken } from '../api/standalone';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface StandaloneChatStore {
  sessions: standaloneApi.StandaloneSessionItem[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  sources: standaloneApi.StandaloneSourceItem[];
  streaming: boolean;
  loading: boolean;
  error: string | null;

  loadSessions: () => Promise<void>;
  createSession: (title?: string) => Promise<standaloneApi.StandaloneSessionItem>;
  setActiveSession: (sessionId: string | null) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  addSource: (sessionId: string, type: 'text' | 'url' | 'file', payload: { title?: string; content?: string; url?: string; file?: File }) => Promise<void>;
  removeSource: (sessionId: string, sourceId: string) => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
  setStreaming: (v: boolean) => void;
  clearMessage: () => void;
  resetState: () => void;
}

export const useStandaloneChatStore = create<StandaloneChatStore>()((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  sources: [],
  streaming: false,
  loading: false,
  error: null,

  loadSessions: async () => {
    set({ loading: true, error: null });
    try {
      const sessions = await standaloneApi.fetchStandaloneSessions();
      set({ sessions, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to load sessions' });
    }
  },

  createSession: async (title) => {
    const session = await standaloneApi.createStandaloneSession(title);
    const { sessions } = get();
    set({ sessions: [session, ...sessions] });
    return session;
  },

  setActiveSession: async (sessionId) => {
    if (!sessionId) {
      set({ activeSessionId: null, messages: [], sources: [] });
      return;
    }
    set({ loading: true, error: null });
    try {
      const detail = await standaloneApi.getStandaloneSession(sessionId);
      set({
        activeSessionId: sessionId,
        messages: detail.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp,
        })),
        sources: detail.sources,
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to load session', activeSessionId: null, messages: [], sources: [] });
    }
  },

  renameSession: async (sessionId, title) => {
    const session = await standaloneApi.renameStandaloneSession(sessionId, title);
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, title: session.title } : s)),
    }));
  },

  deleteSession: async (sessionId) => {
    await standaloneApi.deleteStandaloneSession(sessionId);
    const { sessions, activeSessionId } = get();
    set({
      sessions: sessions.filter((s) => s.id !== sessionId),
      activeSessionId: activeSessionId === sessionId ? null : activeSessionId,
      messages: activeSessionId === sessionId ? [] : get().messages,
    });
  },

  addSource: async (sessionId, type, payload) => {
    set({ error: null });
    try {
      let source: standaloneApi.StandaloneSourceItem;
      if (type === 'text' && payload.content) {
        source = await standaloneApi.uploadStandaloneText(sessionId, payload.title || 'Untitled', payload.content);
      } else if (type === 'url' && payload.url) {
        source = await standaloneApi.uploadStandaloneUrl(sessionId, payload.url);
      } else if (type === 'file' && payload.file) {
        source = await standaloneApi.uploadStandaloneFile(sessionId, payload.file, payload.title);
      } else {
        throw new Error('Invalid source payload');
      }
      const { sources } = get();
      set({ sources: [...sources, source] });
    } catch (err: any) {
      set({ error: err.message || 'Failed to add source' });
    }
  },

  removeSource: async (sessionId, sourceId) => {
    await standaloneApi.deleteStandaloneSource(sessionId, sourceId);
    set((state) => ({
      sources: state.sources.filter((s) => s.id !== sourceId),
    }));
  },

  addMessage: (msg) => {
    set((state) => ({ messages: [...state.messages, msg] }));
  },

  setStreaming: (v) => set({ streaming: v }),

  clearMessage: () => set({ messages: [] }),

  resetState: () => set({
    sessions: [],
    activeSessionId: null,
    messages: [],
    sources: [],
    streaming: false,
    loading: false,
    error: null,
  }),
}));
