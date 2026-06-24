import { create } from 'zustand';
import type { DailyRevisionSummary } from '../api/dailyRevision';
import * as drApi from '../api/dailyRevision';

interface DailyRevisionStore {
  summary: DailyRevisionSummary | null;
  suggestions: string | null;
  loading: boolean;
  loadingSuggestions: boolean;
  error: string | null;

  loadSummary: (workspaceId: string) => Promise<void>;
  loadSuggestions: (workspaceId: string) => Promise<void>;
}

export const useDailyRevisionStore = create<DailyRevisionStore>()((set) => ({
  summary: null,
  suggestions: null,
  loading: false,
  loadingSuggestions: false,
  error: null,

  loadSummary: async (workspaceId) => {
    set({ loading: true, error: null });
    try {
      const summary = await drApi.fetchDailyRevisionSummary(workspaceId);
      set({ summary, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message ?? 'Failed to load revision summary' });
    }
  },

  loadSuggestions: async (workspaceId) => {
    set({ loadingSuggestions: true });
    try {
      const { suggestions } = await drApi.fetchRevisionSuggestions(workspaceId);
      set({ suggestions, loadingSuggestions: false });
    } catch {
      set({ loadingSuggestions: false });
    }
  },
}));
