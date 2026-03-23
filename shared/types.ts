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
