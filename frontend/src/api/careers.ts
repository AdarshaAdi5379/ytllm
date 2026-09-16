import { apiFetch, API_BASE, getAuthToken } from './client';
import type { JobPosting, JobApplication, JobStatus, ApplicationStatus } from '../../../shared/types';

export interface CareersFilterParams {
  department?: string;
  workplace_type?: string;
  search?: string;
}

export interface AdminJobsFilterParams {
  status?: string;
  department?: string;
  search?: string;
}

export interface AdminApplicationsFilterParams {
  job_id?: string;
  status?: string;
  search?: string;
}

// ---------------------------------------------------------------------------
// Public Careers API
// ---------------------------------------------------------------------------

export async function getCareersJobs(params?: CareersFilterParams): Promise<JobPosting[]> {
  const searchParams = new URLSearchParams();
  if (params?.department && params.department !== 'all') {
    searchParams.set('department', params.department);
  }
  if (params?.workplace_type && params.workplace_type !== 'all') {
    searchParams.set('workplace_type', params.workplace_type);
  }
  if (params?.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiFetch<JobPosting[]>(`/careers${query}`);
}

export async function getCareerJob(slug: string): Promise<JobPosting> {
  return apiFetch<JobPosting>(`/careers/${encodeURIComponent(slug)}`);
}

export async function submitCareerApplication(slug: string, formData: FormData): Promise<JobApplication> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/careers/${encodeURIComponent(slug)}/apply`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorData: { error?: string; message?: string; detail?: { error?: string; message?: string } | string } = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'SUBMIT_FAILED', message: `HTTP ${response.status}` };
    }
    const msg =
      typeof errorData.detail === 'string'
        ? errorData.detail
        : errorData.detail?.message || errorData.message || 'Failed to submit application.';
    throw new Error(msg);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Admin Careers API
// ---------------------------------------------------------------------------

export async function getAdminJobs(params?: AdminJobsFilterParams): Promise<JobPosting[]> {
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    searchParams.set('status', params.status);
  }
  if (params?.department && params.department !== 'all') {
    searchParams.set('department', params.department);
  }
  if (params?.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiFetch<JobPosting[]>(`/admin/careers/jobs${query}`);
}

export async function getAdminJob(jobId: string): Promise<JobPosting> {
  return apiFetch<JobPosting>(`/admin/careers/jobs/${encodeURIComponent(jobId)}`);
}

export async function createAdminJob(job: Partial<JobPosting>): Promise<JobPosting> {
  return apiFetch<JobPosting>('/admin/careers/jobs', {
    method: 'POST',
    body: JSON.stringify(job),
  });
}

export async function updateAdminJob(jobId: string, job: Partial<JobPosting>): Promise<JobPosting> {
  return apiFetch<JobPosting>(`/admin/careers/jobs/${encodeURIComponent(jobId)}`, {
    method: 'PUT',
    body: JSON.stringify(job),
  });
}

export async function updateAdminJobStatus(jobId: string, status: JobStatus): Promise<JobPosting> {
  return apiFetch<JobPosting>(`/admin/careers/jobs/${encodeURIComponent(jobId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteAdminJob(jobId: string): Promise<void> {
  await apiFetch<{ status: string; message: string }>(`/admin/careers/jobs/${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
  });
}

export async function getAdminApplications(params?: AdminApplicationsFilterParams): Promise<JobApplication[]> {
  const searchParams = new URLSearchParams();
  if (params?.job_id && params.job_id !== 'all') {
    searchParams.set('job_id', params.job_id);
  }
  if (params?.status && params.status !== 'all') {
    searchParams.set('status', params.status);
  }
  if (params?.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiFetch<JobApplication[]>(`/admin/careers/applications${query}`);
}

export async function getAdminApplication(appId: string): Promise<JobApplication> {
  return apiFetch<JobApplication>(`/admin/careers/applications/${encodeURIComponent(appId)}`);
}

export async function updateAdminApplicationStatus(appId: string, status: ApplicationStatus): Promise<JobApplication> {
  return apiFetch<JobApplication>(`/admin/careers/applications/${encodeURIComponent(appId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getAdminResumeDownloadUrl(appId: string): string {
  return `${API_BASE}/admin/careers/applications/${encodeURIComponent(appId)}/resume`;
}
