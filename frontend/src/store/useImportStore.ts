import { create } from 'zustand';

export interface ImportJob {
  id: string;
  sourceType: string;
  title: string;
  status: 'processing' | 'done' | 'failed';
  error?: string;
  createdAt: number;
}

interface ImportStore {
  jobs: ImportJob[];

  addJob: (sourceType: string, title: string) => string;
  setJobDone: (id: string) => void;
  setJobFailed: (id: string, error: string) => void;
  dismissJob: (id: string) => void;
  clearDone: () => void;
}

let jobCounter = 0;

export const useImportStore = create<ImportStore>()((set, get) => ({
  jobs: [],

  addJob: (sourceType, title) => {
    const id = `import_${++jobCounter}`;
    const job: ImportJob = { id, sourceType, title, status: 'processing', createdAt: Date.now() };
    set((s) => ({ jobs: [...s.jobs, job] }));
    return id;
  },

  setJobDone: (id) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, status: 'done' as const } : j)),
    }));
    setTimeout(() => {
      get().dismissJob(id);
    }, 4000);
  },

  setJobFailed: (id, error) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, status: 'failed' as const, error } : j)),
    }));
  },

  dismissJob: (id) => {
    set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }));
  },

  clearDone: () => {
    set((s) => ({ jobs: s.jobs.filter((j) => j.status === 'processing' || j.status === 'failed') }));
  },
}));
