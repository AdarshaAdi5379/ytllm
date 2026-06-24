import { create } from 'zustand';
import type { ProgressDashboard } from '../api/progress';
import * as progressApi from '../api/progress';

interface ProgressStore {
  dashboard: ProgressDashboard | null;
  weeklyReport: string | null;
  loading: boolean;
  loadingReport: boolean;

  loadDashboard: (workspaceId: string) => Promise<void>;
  loadWeeklyReport: (workspaceId: string) => Promise<void>;
}

export const useProgressStore = create<ProgressStore>()((set) => ({
  dashboard: null,
  weeklyReport: null,
  loading: false,
  loadingReport: false,

  loadDashboard: async (workspaceId) => {
    set({ loading: true });
    try {
      const dashboard = await progressApi.fetchProgressDashboard(workspaceId);
      set({ dashboard, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadWeeklyReport: async (workspaceId) => {
    set({ loadingReport: true });
    try {
      const { report } = await progressApi.fetchWeeklyReport(workspaceId);
      set({ weeklyReport: report, loadingReport: false });
    } catch {
      set({ loadingReport: false });
    }
  },
}));
