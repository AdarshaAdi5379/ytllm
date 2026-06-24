import { create } from 'zustand';
import type { QuizItem, QuizSubmitResult } from '../api/quiz';
import * as quizApi from '../api/quiz';

interface QuizStore {
  quizzes: QuizItem[];
  loading: boolean;
  takingQuiz: QuizItem | null;
  submitResult: QuizSubmitResult | null;

  loadQuizzes: (workspaceId: string, sourceId?: string, quizType?: string) => Promise<void>;
  generateQuiz: (sourceId: string, quizType?: string, count?: number, timeLimitMinutes?: number) => Promise<QuizItem>;
  startQuiz: (quiz: QuizItem) => void;
  submitQuiz: (quizId: string, answers: { question_id: string; answer: string | number | null }[]) => Promise<QuizSubmitResult>;
  deleteQuiz: (quizId: string) => Promise<void>;
  clearTakingQuiz: () => void;
}

export const useQuizStore = create<QuizStore>()((set, get) => ({
  quizzes: [],
  loading: false,
  takingQuiz: null,
  submitResult: null,

  loadQuizzes: async (workspaceId, sourceId, quizType) => {
    set({ loading: true });
    try {
      const quizzes = await quizApi.fetchQuizzes(workspaceId, sourceId, quizType);
      set({ quizzes, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  generateQuiz: async (sourceId, quizType = 'mcq', count = 5, timeLimitMinutes) => {
    const quiz = await quizApi.generateQuiz(sourceId, quizType, count, timeLimitMinutes);
    const { quizzes } = get();
    set({ quizzes: [quiz, ...quizzes] });
    return quiz;
  },

  startQuiz: (quiz) => {
    set({ takingQuiz: quiz, submitResult: null });
  },

  submitQuiz: async (quizId, answers) => {
    const result = await quizApi.submitQuiz(quizId, answers);
    set({ submitResult: result });
    const { quizzes } = get();
    set({
      quizzes: quizzes.map((q) =>
        q.id === quizId ? { ...q, score: result.score, max_score: result.max_score, completed_at: result.completed_at } : q
      ),
    });
    return result;
  },

  deleteQuiz: async (quizId) => {
    await quizApi.deleteQuiz(quizId);
    const { quizzes } = get();
    set({ quizzes: quizzes.filter((q) => q.id !== quizId) });
  },

  clearTakingQuiz: () => set({ takingQuiz: null, submitResult: null }),
}));
