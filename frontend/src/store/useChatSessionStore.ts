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

  loadSessions: (workspaceId: string) => Promise<void>;
  createSession: (workspaceId: string, title?: string, sourceIds?: string[]) => Promise<ChatSessionItem>;
  setActiveSession: (workspaceId: string, sessionId: string | null) => Promise<void>;
  deleteSessionFromStore: (workspaceId: string, sessionId: string) => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
  setStreaming: (v: boolean) => void;
  clearMessages: () => void;
}

export const useChatSessionStore = create<ChatSessionStore>()((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  streaming: false,
  loading: false,

  loadSessions: async (workspaceId: string) => {
    set({ loading: true });
    try {
      const sessions = await workspaceApi.fetchSessions(workspaceId);
      set({ sessions, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createSession: async (workspaceId, title, sourceIds) => {
    const session = await workspaceApi.createSession(workspaceId, title, sourceIds);
    const { sessions } = get();
    set({ sessions: [session, ...sessions] });
    return session;
  },

  setActiveSession: async (workspaceId, sessionId) => {
    if (!sessionId) {
      set({ activeSessionId: null, messages: [] });
      return;
    }
    try {
      const detail = await workspaceApi.getSession(workspaceId, sessionId);
      set({
        activeSessionId: sessionId,
        messages: detail.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp,
        })),
      });
    } catch {
      set({ activeSessionId: null, messages: [] });
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

  addMessage: (msg) => {
    set((state) => ({ messages: [...state.messages, msg] }));
  },

  setStreaming: (v) => set({ streaming: v }),

  clearMessages: () => set({ messages: [], activeSessionId: null }),
}));
