// Shared TypeScript types for frontend and backend

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface VideoMeta {
  videoId: string;
  title: string;
  channelName: string;
  duration: string;
  thumbnailUrl: string;
}

export interface TranscriptResponse {
  videoId: string;
  title: string;
  channelName: string;
  duration: string;
  thumbnailUrl: string;
  transcript: string;
  summary: string;
  suggestedQuestions: string[];
  chunkCount: number;
}

export interface ChatRequest {
  videoId: string;
  question: string;
  chatHistory: Message[];
  systemPrompt: string;
}

export interface ExportRequest {
  videoId: string;
  format: 'pdf' | 'docx';
  includeTranscript: boolean;
  chatHistory: Message[];
}

export interface ApiError {
  error: string;
  message: string;
}

export interface HealthResponse {
  status: 'ok';
  version: string;
  timestamp: string;
}

export type JobStatus = 'draft' | 'published' | 'closed';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';
export type WorkplaceType = 'remote' | 'hybrid' | 'onsite';
export type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'interview' | 'rejected' | 'hired';

export interface JobPosting {
  id: string;
  title: string;
  slug: string;
  department: string;
  employment_type: EmploymentType;
  workplace_type: WorkplaceType;
  location: string;
  duration?: string | null;
  compensation_type?: string | null;
  compensation_amount?: string | null;
  short_description: string;
  description: string;
  responsibilities: string;
  requirements: string;
  nice_to_have: string;
  what_you_will_learn: string;
  benefits: string;
  application_method: 'internal' | 'external';
  application_url?: string | null;
  status: JobStatus;
  published_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  json_ld?: Record<string, unknown> | null;
  application_count?: number;
}

export interface JobApplication {
  id: string;
  job_id: string;
  job_title?: string | null;
  job_slug?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  resume: string;
  github_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  cover_letter?: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

