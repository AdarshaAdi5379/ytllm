import { create } from 'zustand';

interface AppStore {
  appMode: 'standalone' | 'workspace';
  setAppMode: (mode: 'standalone' | 'workspace') => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  appMode: 'standalone',
  setAppMode: (mode) => set({ appMode: mode }),
}));
