import { create } from 'zustand';
import type { MentorSessionItem, MentorMessage, RespondResult, EndSessionResult } from '../api/mentor';
import * as mentorApi from '../api/mentor';

interface MentorStore {
  sessions: MentorSessionItem[];
  activeSession: MentorSessionItem | null;
  messages: MentorMessage[];
  respondResult: RespondResult | null;
  endResult: EndSessionResult | null;
  loading: boolean;
  responding: boolean;
  starting: boolean;

  loadSessions: (workspaceId: string) => Promise<void>;
  startSession: (workspaceId: string, topic: string, sourceIds?: string[], context?: string) => Promise<string | null>;
  respond: (answer: string) => Promise<RespondResult | null>;
  endSession: () => Promise<EndSessionResult | null>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearActiveSession: () => void;
}

export const useMentorStore = create<MentorStore>()((set, get) => ({
  sessions: [],
  activeSession: null,
  messages: [],
  respondResult: null,
  endResult: null,
  loading: false,
  responding: false,
  starting: false,

  loadSessions: async (workspaceId) => {
    set({ loading: true });
    try {
      const sessions = await mentorApi.fetchMentorSessions(workspaceId);
      set({ sessions, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  startSession: async (workspaceId, topic, sourceIds, context) => {
    set({ starting: true, endResult: null });
    try {
      const result = await mentorApi.startMentorSession(workspaceId, topic, sourceIds, context);
      const aiMsg: MentorMessage = {
        role: 'ai',
        content: result.first_question,
        evaluation: null,
      };
      set({
        activeSession: result.session,
        messages: [aiMsg],
        respondResult: null,
        starting: false,
      });
      // Refresh the sessions list
      const { sessions } = get();
      set({ sessions: [result.session, ...sessions] });
      return result.session.id;
    } catch {
      set({ starting: false });
      return null;
    }
  },

  respond: async (answer) => {
    const { activeSession, messages } = get();
    if (!activeSession) return null;

    set({ responding: true });
    try {
      const userMsg: MentorMessage = { role: 'user', content: answer };
      set({ messages: [...messages, userMsg] });

      const result = await mentorApi.respondMentor(activeSession.id, answer);
      set({ respondResult: result });

      const aiMsg: MentorMessage = {
        role: 'ai',
        content: result.follow_up_question || result.explanation,
        evaluation: result.evaluation,
        explanation: result.explanation,
        correct_answer: result.correct_answer,
        assessment: result.assessment,
      };
      set({ messages: [...get().messages, aiMsg], responding: false });

      if (result.session_complete) {
        // Auto-end the session
        const endResult = await mentorApi.endMentorSession(activeSession.id);
        set({ endResult, activeSession: { ...get().activeSession!, status: 'completed' } });
      }

      return result;
    } catch {
      set({ responding: false });
      return null;
    }
  },

  endSession: async () => {
    const { activeSession } = get();
    if (!activeSession) return null;
    try {
      const result = await mentorApi.endMentorSession(activeSession.id);
      set({
        endResult: result,
        activeSession: { ...activeSession, status: 'completed' },
      });
      return result;
    } catch {
      return null;
    }
  },

  loadSession: async (sessionId) => {
    set({ loading: true });
    try {
      const session = await mentorApi.fetchMentorSession(sessionId);
      const messages: MentorMessage[] = JSON.parse(session.messages || '[]');
      set({ activeSession: session, messages, loading: false, endResult: null, respondResult: null });
    } catch {
      set({ loading: false });
    }
  },

  deleteSession: async (sessionId) => {
    try {
      await mentorApi.deleteMentorSession(sessionId);
      const { sessions, activeSession } = get();
      set({
        sessions: sessions.filter((s) => s.id !== sessionId),
        activeSession: activeSession?.id === sessionId ? null : activeSession,
        messages: activeSession?.id === sessionId ? [] : get().messages,
        endResult: activeSession?.id === sessionId ? null : get().endResult,
      });
    } catch {
      // noop
    }
  },

  clearActiveSession: () => {
    set({ activeSession: null, messages: [], respondResult: null, endResult: null });
  },
}));
