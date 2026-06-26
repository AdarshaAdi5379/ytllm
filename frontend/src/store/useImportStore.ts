import { create } from 'zustand';

export interface JobProgress {
  current: number;
  total: number;
  phase: string;
}

export interface ImportJob {
  id: string;
  sourceType: string;
  title: string;
  status: 'processing' | 'done' | 'failed';
  taskId?: string;
  progress?: JobProgress;
  error?: string;
  createdAt: number;
}

interface ImportStore {
  jobs: ImportJob[];

  addJob: (sourceType: string, title: string, taskId?: string) => string;
  setJobDone: (id: string) => void;
  setJobFailed: (id: string, error: string) => void;
  updateJob: (id: string, partial: Partial<ImportJob>) => void;
  dismissJob: (id: string) => void;
  clearDone: () => void;
}

let jobCounter = 0;

export const useImportStore = create<ImportStore>()((set, get) => ({
  jobs: [],

  addJob: (sourceType, title, taskId) => {
    const id = `import_${++jobCounter}`;
    const job: ImportJob = { id, sourceType, title, status: 'processing', taskId, createdAt: Date.now() };
    set((s) => ({ jobs: [...s.jobs, job] }));
    return id;
  },

  setJobDone: (id) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, status: 'done' as const } : j)),
    }));
    setTimeout(() => {
      const { jobs, dismissJob } = get();
      if (jobs.find((j) => j.id === id)?.status === 'done') {
        dismissJob(id);
      }
    }, 4000);
  },

  setJobFailed: (id, error) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, status: 'failed' as const, error } : j)),
    }));
  },

  updateJob: (id, partial) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...partial } : j)),
    }));
  },

  dismissJob: (id) => {
    set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }));
  },

  clearDone: () => {
    set((s) => ({ jobs: s.jobs.filter((j) => j.status === 'processing' || j.status === 'failed') }));
  },
}));
