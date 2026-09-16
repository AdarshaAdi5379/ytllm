import { create } from 'zustand';
import type { ProgressDashboard, TopicDetailResponse } from '../api/progress';
import * as progressApi from '../api/progress';

interface ProgressStore {
  dashboard: ProgressDashboard | null;
  weeklyReport: string | null;
  selectedTopicDetails: TopicDetailResponse | null;
  loading: boolean;
  loadingReport: boolean;
  loadingTopicDetails: boolean;

  loadDashboard: (workspaceId: string) => Promise<void>;
  loadWeeklyReport: (workspaceId: string) => Promise<void>;
  loadTopicDetails: (topicId: string) => Promise<void>;
  clearTopicDetails: () => void;
}

export const useProgressStore = create<ProgressStore>()((set) => ({
  dashboard: null,
  weeklyReport: null,
  selectedTopicDetails: null,
  loading: false,
  loadingReport: false,
  loadingTopicDetails: false,

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

  loadTopicDetails: async (topicId) => {
    set({ loadingTopicDetails: true });
    try {
      const details = await progressApi.fetchTopicDetails(topicId);
      set({ selectedTopicDetails: details, loadingTopicDetails: false });
    } catch {
      set({ loadingTopicDetails: false });
    }
  },

  clearTopicDetails: () => {
    set({ selectedTopicDetails: null });
  },
}));

