import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  isPlayerOpen: boolean;
  customName?: string;
  isPinned: boolean;
  savedVideoId?: string;
}

interface VideoStore {
  videos: Record<string, VideoSlice>;
  activeVideoId: string | null;
  isAddVideoModalOpen: boolean;

  // Actions
  addVideo: (slice: Omit<VideoSlice, 'chatHistory' | 'rollingChatSummary' | 'isStreaming' | 'isPlayerOpen' | 'isPinned'>) => void;
  removeVideo: (videoId: string) => void;
  setActiveVideo: (videoId: string) => void;
  setVideoStatus: (videoId: string, status: VideoSlice['status'], errorMessage?: string) => void;

  addMessage: (videoId: string, message: Message) => void;
  appendStreamingToken: (videoId: string, token: string) => void;
  finaliseStreamingMessage: (videoId: string) => void;
  setStreaming: (videoId: string, isStreaming: boolean) => void;

  setPlayerOpen: (videoId: string, open: boolean) => void;

  renameVideo: (videoId: string, name: string) => void;
  setPinned: (videoId: string, pinned: boolean) => void;
  setSavedVideoId: (videoId: string, savedId: string) => void;

  clearVideos: () => void;

  openAddVideoModal: () => void;
  closeAddVideoModal: () => void;
}

export const useVideoStore = create<VideoStore>()(
  persist(
    (set, get) => ({
      videos: {},
      activeVideoId: null,
      isAddVideoModalOpen: false,

      addVideo: (slice) =>
        set((state) => ({
          videos: {
            ...state.videos,
            [slice.videoId]: {
              ...slice,
              chatHistory: [],
              rollingChatSummary: null,
              isStreaming: false,
              isPlayerOpen: false,
              isPinned: false,
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
            history[history.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + token,
            };
          } else {
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

      setPlayerOpen: (videoId, open) =>
        set((state) => ({
          videos: {
            ...state.videos,
            [videoId]: { ...state.videos[videoId], isPlayerOpen: open },
          },
        })),

      renameVideo: (videoId, name) =>
        set((state) => ({
          videos: {
            ...state.videos,
            [videoId]: { ...state.videos[videoId], customName: name || undefined },
          },
        })),

      setPinned: (videoId, pinned) =>
        set((state) => ({
          videos: {
            ...state.videos,
            [videoId]: { ...state.videos[videoId], isPinned: pinned },
          },
        })),

      setSavedVideoId: (videoId, savedId) =>
        set((state) => ({
          videos: {
            ...state.videos,
            [videoId]: { ...state.videos[videoId], savedVideoId: savedId },
          },
        })),

      clearVideos: () => set({ videos: {}, activeVideoId: null }),

      openAddVideoModal: () => set({ isAddVideoModalOpen: true }),
      closeAddVideoModal: () => set({ isAddVideoModalOpen: false }),
    }),
    {
      name: 'knowledgeos-videos',
      partialize: (state) => ({
        videos: state.videos,
        activeVideoId: state.activeVideoId,
      }),
      merge: (persisted, current) => {
        const p = persisted as { videos?: Record<string, VideoSlice>; activeVideoId?: string | null };
        if (!p.videos || Object.keys(p.videos).length === 0) {
          return { ...current, videos: {}, activeVideoId: null, isAddVideoModalOpen: false };
        }
        const cleanedVideos: Record<string, VideoSlice> = {};
        for (const [id, v] of Object.entries(p.videos)) {
          cleanedVideos[id] = {
            ...v,
            isStreaming: false,
            isPlayerOpen: false,
            status: 'ready' as const,
            errorMessage: null,
          };
        }
        return {
          ...current,
          videos: cleanedVideos,
          activeVideoId: p.activeVideoId ?? null,
          isAddVideoModalOpen: false,
        };
      },
    }
  )
);
