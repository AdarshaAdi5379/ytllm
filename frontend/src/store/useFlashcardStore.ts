import { create } from 'zustand';
import type { FlashcardItem, ReviewQueueItem, FlashcardStats } from '../api/flashcards';
import * as fcApi from '../api/flashcards';

interface FlashcardStore {
  flashcards: FlashcardItem[];
  reviewQueue: ReviewQueueItem[];
  upcomingReviews: ReviewQueueItem[];
  stats: FlashcardStats | null;
  loading: boolean;
  reviewMode: boolean;
  currentCardIndex: number;

  loadFlashcards: (workspaceId: string, sourceId?: string, difficulty?: string) => Promise<void>;
  loadReviewQueue: (workspaceId: string) => Promise<void>;
  loadUpcomingReviews: (workspaceId: string, days?: number) => Promise<void>;
  loadStats: (workspaceId: string) => Promise<void>;
  createFlashcard: (workspaceId: string, question: string, answer: string, difficulty?: string, sourceId?: string) => Promise<FlashcardItem>;
  generateFlashcards: (sourceId: string, count?: number) => Promise<FlashcardItem[]>;
  updateFlashcard: (id: string, data: { question?: string; answer?: string; difficulty?: string }) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  reviewFlashcard: (id: string, rating: number) => Promise<void>;
  setReviewMode: (mode: boolean) => void;
  nextCard: () => void;
  prevCard: () => void;
  resetReview: () => void;
}

export const useFlashcardStore = create<FlashcardStore>()((set, get) => ({
  flashcards: [],
  reviewQueue: [],
  upcomingReviews: [],
  stats: null,
  loading: false,
  reviewMode: false,
  currentCardIndex: 0,

  loadFlashcards: async (workspaceId, sourceId, difficulty) => {
    set({ loading: true });
    try {
      const flashcards = await fcApi.fetchFlashcards(workspaceId, sourceId, difficulty);
      set({ flashcards, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadReviewQueue: async (workspaceId) => {
    try {
      const reviewQueue = await fcApi.fetchReviewQueue(workspaceId);
      set({ reviewQueue });
    } catch {
      // ignore
    }
  },

  loadUpcomingReviews: async (workspaceId, days) => {
    try {
      const upcomingReviews = await fcApi.fetchUpcomingReviews(workspaceId, days);
      set({ upcomingReviews });
    } catch {
      // ignore
    }
  },

  loadStats: async (workspaceId) => {
    try {
      const stats = await fcApi.fetchFlashcardStats(workspaceId);
      set({ stats });
    } catch {
      // ignore
    }
  },

  createFlashcard: async (workspaceId, question, answer, difficulty, sourceId) => {
    const card = await fcApi.createFlashcard(workspaceId, question, answer, difficulty, sourceId);
    const { flashcards } = get();
    set({ flashcards: [card, ...flashcards] });
    return card;
  },

  generateFlashcards: async (sourceId, count) => {
    const cards = await fcApi.generateFlashcards(sourceId, count);
    const { flashcards } = get();
    set({ flashcards: [...cards, ...flashcards] });
    return cards;
  },

  updateFlashcard: async (id, data) => {
    const updated = await fcApi.updateFlashcard(id, data);
    const { flashcards } = get();
    set({
      flashcards: flashcards.map((f) => (f.id === id ? { ...f, ...updated } : f)),
    });
  },

  deleteFlashcard: async (id) => {
    await fcApi.deleteFlashcard(id);
    const { flashcards } = get();
    set({
      flashcards: flashcards.filter((f) => f.id !== id),
    });
  },

  reviewFlashcard: async (id, rating) => {
    const updated = await fcApi.reviewFlashcard(id, rating);
    const { reviewQueue } = get();
    set({
      reviewQueue: reviewQueue.map((f) => (f.id === id ? { ...f, ...updated } : f)),
    });
  },

  setReviewMode: (mode) => set({ reviewMode: mode, currentCardIndex: 0 }),
  nextCard: () => {
    const { currentCardIndex, reviewQueue } = get();
    if (currentCardIndex < reviewQueue.length - 1) {
      set({ currentCardIndex: currentCardIndex + 1 });
    }
  },
  prevCard: () => {
    const { currentCardIndex } = get();
    if (currentCardIndex > 0) {
      set({ currentCardIndex: currentCardIndex - 1 });
    }
  },
  resetReview: () => set({ reviewMode: false, currentCardIndex: 0 }),
}));
