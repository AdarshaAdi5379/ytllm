import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

export type WorkspaceViewMode = 'home' | 'chat' | 'notes' | 'search' | 'summary' | 'flashcard' | 'quiz' | 'path' | 'revision' | 'progress' | 'mentor';

interface AppStore {
  appMode: 'standalone' | 'workspace';
  viewMode: WorkspaceViewMode;
  sidebarOpen: boolean;
  setAppMode: (mode: 'standalone' | 'workspace') => void;
  setViewMode: (mode: WorkspaceViewMode) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  appMode: 'standalone',
  viewMode: 'home',
  sidebarOpen: false,
  setAppMode: (mode) => set({ appMode: mode }),
  setViewMode: (mode) => {
    set({ viewMode: mode, sidebarOpen: false });
    const auth = useAuthStore.getState();
    if (auth.showOnboarding) {
      auth.completeOnboarding();
    }
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
