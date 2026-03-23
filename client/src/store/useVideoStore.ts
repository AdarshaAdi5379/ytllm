import { create } from 'zustand';
import type { Message } from '../../../shared/types';

export interface VideoSlice {
  videoId: string;
  title: string;
  channelName: string;
  duration: string;
  thumbnailUrl: string;
  transcript: string;
  summary: string;
  suggestedQuestions: string[];
  systemPrompt: string;
  chatHistory: Message[];
  rollingChatSummary: string | null;
  status: 'loading' | 'ready' | 'error';
  errorMessage: string | null;
  isStreaming: boolean;
}

interface VideoStore {
  videos: Record<string, VideoSlice>;
  activeVideoId: string | null;
  isAddVideoModalOpen: boolean;

  // Actions
  addVideo: (slice: Omit<VideoSlice, 'chatHistory' | 'rollingChatSummary' | 'isStreaming'>) => void;
  removeVideo: (videoId: string) => void;
  setActiveVideo: (videoId: string) => void;
  setVideoStatus: (videoId: string, status: VideoSlice['status'], errorMessage?: string) => void;

  addMessage: (videoId: string, message: Message) => void;
  appendStreamingToken: (videoId: string, token: string) => void;
  finaliseStreamingMessage: (videoId: string) => void;
  setStreaming: (videoId: string, isStreaming: boolean) => void;

  openAddVideoModal: () => void;
  closeAddVideoModal: () => void;
}

export const useVideoStore = create<VideoStore>((set, get) => ({
  videos: {},
  activeVideoId: null,
  isAddVideoModalOpen: true, // Open on first load

  addVideo: (slice) =>
    set((state) => ({
      videos: {
        ...state.videos,
        [slice.videoId]: {
          ...slice,
          chatHistory: [],
          rollingChatSummary: null,
          isStreaming: false,
        },
      },
      activeVideoId: slice.videoId,
      isAddVideoModalOpen: false,
    })),

  removeVideo: (videoId) =>
    set((state) => {
      const videos = { ...state.videos };
      delete videos[videoId];

      const remainingIds = Object.keys(videos);
      const newActive =
        state.activeVideoId === videoId
          ? remainingIds[remainingIds.length - 1] ?? null
          : state.activeVideoId;

      return {
        videos,
        activeVideoId: newActive,
        isAddVideoModalOpen: newActive === null,
      };
    }),

  setActiveVideo: (videoId) => set({ activeVideoId: videoId }),

  setVideoStatus: (videoId, status, errorMessage) =>
    set((state) => ({
      videos: {
        ...state.videos,
        [videoId]: {
          ...state.videos[videoId],
          status,
          errorMessage: errorMessage ?? null,
        },
      },
    })),

  addMessage: (videoId, message) =>
    set((state) => ({
      videos: {
        ...state.videos,
        [videoId]: {
          ...state.videos[videoId],
          chatHistory: [...(state.videos[videoId]?.chatHistory ?? []), message],
        },
      },
    })),

  appendStreamingToken: (videoId, token) =>
    set((state) => {
      const video = state.videos[videoId];
      if (!video) return state;

      const history = [...video.chatHistory];
      const lastMsg = history[history.length - 1];

      if (lastMsg && lastMsg.role === 'assistant') {
        // Append to existing streaming message
        history[history.length - 1] = {
          ...lastMsg,
          content: lastMsg.content + token,
        };
      } else {
        // Start new AI message
        history.push({
          role: 'assistant',
          content: token,
          timestamp: new Date().toISOString(),
        });
      }

      return {
        videos: {
          ...state.videos,
          [videoId]: { ...video, chatHistory: history },
        },
      };
    }),

  finaliseStreamingMessage: (videoId) => {
    const video = get().videos[videoId];
    if (!video) return;
    set((state) => ({
      videos: {
        ...state.videos,
        [videoId]: { ...video, isStreaming: false },
      },
    }));
  },

  setStreaming: (videoId, isStreaming) =>
    set((state) => ({
      videos: {
        ...state.videos,
        [videoId]: { ...state.videos[videoId], isStreaming },
      },
    })),

  openAddVideoModal: () => set({ isAddVideoModalOpen: true }),
  closeAddVideoModal: () => set({ isAddVideoModalOpen: false }),
}));
