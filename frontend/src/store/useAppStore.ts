import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

export type WorkspaceViewMode = 'home' | 'chat' | 'notes' | 'search' | 'summary' | 'flashcard' | 'quiz' | 'path' | 'revision' | 'progress' | 'mentor';

interface AppStore {
  appMode: 'standalone' | 'workspace';
  viewMode: WorkspaceViewMode;
  setAppMode: (mode: 'standalone' | 'workspace') => void;
  setViewMode: (mode: WorkspaceViewMode) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  appMode: 'standalone',
  viewMode: 'home',
  setAppMode: (mode) => set({ appMode: mode }),
  setViewMode: (mode) => {
    set({ viewMode: mode });
    // Any explicit navigation implies the user is past onboarding. Without this,
    // the OnboardingWizard keeps replacing WorkspaceChatPanel (hiding the header
    // tabs and making the sidebar learning buttons appear unresponsive).
    const auth = useAuthStore.getState();
    if (auth.showOnboarding) {
      auth.completeOnboarding();
    }
  },
}));
