import { create } from 'zustand';
import type { JobPosting, JobApplication, JobStatus, ApplicationStatus } from '../../../shared/types';
import {
  getCareersJobs,
  getCareerJob,
  submitCareerApplication,
  getAdminJobs,
  getAdminJob,
  createAdminJob,
  updateAdminJob,
  updateAdminJobStatus,
  deleteAdminJob,
  getAdminApplications,
  getAdminApplication,
  updateAdminApplicationStatus,
  CareersFilterParams,
  AdminJobsFilterParams,
  AdminApplicationsFilterParams,
} from '../api/careers';

interface CareersState {
  // Public State
  publicJobs: JobPosting[];
  selectedJob: JobPosting | null;
  isPublicLoading: boolean;
  publicError: string | null;

  // Admin State
  adminJobs: JobPosting[];
  adminApplications: JobApplication[];
  selectedAdminJob: JobPosting | null;
  selectedAdminApp: JobApplication | null;
  isAdminLoading: boolean;
  adminError: string | null;

  // Public Actions
  fetchPublicJobs: (params?: CareersFilterParams) => Promise<void>;
  fetchPublicJobBySlug: (slug: string) => Promise<JobPosting | null>;
  applyToJob: (slug: string, formData: FormData) => Promise<JobApplication>;
  clearSelectedJob: () => void;

  // Admin Actions
  fetchAdminJobs: (params?: AdminJobsFilterParams) => Promise<void>;
  fetchAdminApplications: (params?: AdminApplicationsFilterParams) => Promise<void>;
  createJob: (job: Partial<JobPosting>) => Promise<JobPosting>;
  editJob: (jobId: string, job: Partial<JobPosting>) => Promise<JobPosting>;
  setJobStatus: (jobId: string, status: JobStatus) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  setApplicationStatus: (appId: string, status: ApplicationStatus) => Promise<void>;
  setSelectedAdminJob: (job: JobPosting | null) => void;
  setSelectedAdminApp: (app: JobApplication | null) => void;
}

export const useCareersStore = create<CareersState>((set, get) => ({
  publicJobs: [],
  selectedJob: null,
  isPublicLoading: false,
  publicError: null,

  adminJobs: [],
  adminApplications: [],
  selectedAdminJob: null,
  selectedAdminApp: null,
  isAdminLoading: false,
  adminError: null,

  fetchPublicJobs: async (params) => {
    set({ isPublicLoading: true, publicError: null });
    try {
      const jobs = await getCareersJobs(params);
      set({ publicJobs: jobs, isPublicLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load jobs';
      set({ publicError: message, isPublicLoading: false });
    }
  },

  fetchPublicJobBySlug: async (slug) => {
    set({ isPublicLoading: true, publicError: null });
    try {
      const job = await getCareerJob(slug);
      set({ selectedJob: job, isPublicLoading: false });
      return job;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Job not found';
      set({ publicError: message, isPublicLoading: false });
      return null;
    }
  },

  applyToJob: async (slug, formData) => {
    return await submitCareerApplication(slug, formData);
  },

  clearSelectedJob: () => set({ selectedJob: null, publicError: null }),

  fetchAdminJobs: async (params) => {
    set({ isAdminLoading: true, adminError: null });
    try {
      const jobs = await getAdminJobs(params);
      set({ adminJobs: jobs, isAdminLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load admin jobs';
      set({ adminError: message, isAdminLoading: false });
    }
  },

  fetchAdminApplications: async (params) => {
    set({ isAdminLoading: true, adminError: null });
    try {
      const apps = await getAdminApplications(params);
      set({ adminApplications: apps, isAdminLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load applications';
      set({ adminError: message, isAdminLoading: false });
    }
  },

  createJob: async (jobData) => {
    set({ isAdminLoading: true, adminError: null });
    try {
      const created = await createAdminJob(jobData);
      set((state) => ({
        adminJobs: [created, ...state.adminJobs],
        isAdminLoading: false,
      }));
      return created;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create job';
      set({ adminError: message, isAdminLoading: false });
      throw err;
    }
  },

  editJob: async (jobId, jobData) => {
    set({ isAdminLoading: true, adminError: null });
    try {
      const updated = await updateAdminJob(jobId, jobData);
      set((state) => ({
        adminJobs: state.adminJobs.map((j) => (j.id === jobId ? updated : j)),
        selectedAdminJob: state.selectedAdminJob?.id === jobId ? updated : state.selectedAdminJob,
        isAdminLoading: false,
      }));
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update job';
      set({ adminError: message, isAdminLoading: false });
      throw err;
    }
  },

  setJobStatus: async (jobId, status) => {
    try {
      const updated = await updateAdminJobStatus(jobId, status);
      set((state) => ({
        adminJobs: state.adminJobs.map((j) => (j.id === jobId ? updated : j)),
        selectedAdminJob: state.selectedAdminJob?.id === jobId ? updated : state.selectedAdminJob,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update job status';
      set({ adminError: message });
      throw err;
    }
  },

  deleteJob: async (jobId) => {
    try {
      await deleteAdminJob(jobId);
      set((state) => ({
        adminJobs: state.adminJobs.filter((j) => j.id !== jobId),
        selectedAdminJob: state.selectedAdminJob?.id === jobId ? null : state.selectedAdminJob,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete job';
      set({ adminError: message });
      throw err;
    }
  },

  setApplicationStatus: async (appId, status) => {
    try {
      const updated = await updateAdminApplicationStatus(appId, status);
      set((state) => ({
        adminApplications: state.adminApplications.map((a) => (a.id === appId ? updated : a)),
        selectedAdminApp: state.selectedAdminApp?.id === appId ? updated : state.selectedAdminApp,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update application status';
      set({ adminError: message });
      throw err;
    }
  },

  setSelectedAdminJob: (job) => set({ selectedAdminJob: job }),
  setSelectedAdminApp: (app) => set({ selectedAdminApp: app }),
}));
