import { create } from 'zustand';
import type { ChatSessionItem, SessionDetail } from '../api/workspace';
import * as workspaceApi from '../api/workspace';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSessionStore {
  sessions: ChatSessionItem[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  streaming: boolean;
  loading: boolean;
  error: string | null;

  loadSessions: (workspaceId: string) => Promise<void>;
  createSession: (workspaceId: string, title?: string, sourceIds?: string[], model?: string, temperature?: number) => Promise<ChatSessionItem>;
  setActiveSession: (workspaceId: string, sessionId: string | null) => Promise<void>;
  deleteSessionFromStore: (workspaceId: string, sessionId: string) => Promise<void>;
  addSession: (session: ChatSessionItem) => void;
  addMessage: (msg: ChatMessage) => void;
  setStreaming: (v: boolean) => void;
  clearMessages: () => void;
  resetState: () => void;
}

let sessionLoadRequest = 0;

export const useChatSessionStore = create<ChatSessionStore>()((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  streaming: false,
  loading: false,
  error: null,

  loadSessions: async (workspaceId: string) => {
    set({ loading: true, error: null });
    try {
      const sessions = await workspaceApi.fetchSessions(workspaceId);
      set({ sessions, loading: false, error: null });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to load chats' });
    }
  },

  createSession: async (workspaceId, title, sourceIds, model, temperature) => {
    const session = await workspaceApi.createSession(workspaceId, title, sourceIds, model, temperature);
    const { sessions } = get();
    set({ sessions: [session, ...sessions] });
    return session;
  },

  setActiveSession: async (workspaceId, sessionId) => {
    const requestId = ++sessionLoadRequest;
    if (!sessionId) {
      set({ activeSessionId: null, messages: [], error: null });
      return;
    }
    try {
      const detail = await workspaceApi.getSession(workspaceId, sessionId);
      if (requestId !== sessionLoadRequest) return;
      set({
        activeSessionId: sessionId,
        error: null,
        messages: detail.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp,
        })),
      });
    } catch {
      if (requestId !== sessionLoadRequest) return;
      set({ activeSessionId: null, messages: [], error: 'Failed to load chat' });
    }
  },

  deleteSessionFromStore: async (workspaceId, sessionId) => {
    await workspaceApi.deleteSession(workspaceId, sessionId);
    const { sessions, activeSessionId } = get();
    set({
      sessions: sessions.filter((s) => s.id !== sessionId),
      activeSessionId: activeSessionId === sessionId ? null : activeSessionId,
      messages: activeSessionId === sessionId ? [] : get().messages,
    });
  },

  addSession: (session) => {
    set((state) => ({
      sessions: [session, ...state.sessions.filter((s) => s.id !== session.id)],
    }));
  },

  addMessage: (msg) => {
    set((state) => ({ messages: [...state.messages, msg] }));
  },

  setStreaming: (v) => set({ streaming: v }),

  clearMessages: () => set({ messages: [], activeSessionId: null, error: null }),

  resetState: () => {
    set({
      sessions: [],
      activeSessionId: null,
      messages: [],
      streaming: false,
      loading: false,
      error: null,
    });
  },
}));
