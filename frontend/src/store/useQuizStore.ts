import { create } from 'zustand';
import type { QuizItem, QuizSubmitResult } from '../api/quiz';
import * as quizApi from '../api/quiz';
import { notifyMasteryUpdated } from './syncMastery';

interface QuizStore {
  quizzes: QuizItem[];
  loading: boolean;
  takingQuiz: QuizItem | null;
  submitResult: QuizSubmitResult | null;

  loadQuizzes: (workspaceId: string, sourceId?: string, quizType?: string) => Promise<void>;
  generateQuiz: (
    sourceId: string,
    quizType?: string,
    count?: number,
    timeLimitMinutes?: number,
    prioritizeWeakTopics?: boolean,
  ) => Promise<QuizItem>;
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

  generateQuiz: async (sourceId, quizType = 'mcq', count = 5, timeLimitMinutes, prioritizeWeakTopics = false) => {
    const quiz = await quizApi.generateQuiz(sourceId, quizType, count, timeLimitMinutes, prioritizeWeakTopics);
    const { quizzes } = get();
    set({ quizzes: [quiz, ...quizzes] });
    return quiz;
  },

  startQuiz: (quiz) => {
    set({ takingQuiz: quiz, submitResult: null });
  },

  submitQuiz: async (quizId, answers) => {
    const { quizzes, takingQuiz } = get();
    const result = await quizApi.submitQuiz(quizId, answers);
    set({ submitResult: result });
    const targetWsId = takingQuiz?.workspace_id || quizzes.find((q) => q.id === quizId)?.workspace_id;
    set({
      quizzes: quizzes.map((q) =>
        q.id === quizId ? { ...q, score: result.score, max_score: result.max_score, completed_at: result.completed_at } : q
      ),
    });
    notifyMasteryUpdated(targetWsId);
    return result;
  },

  deleteQuiz: async (quizId) => {
    await quizApi.deleteQuiz(quizId);
    const { quizzes } = get();
    set({ quizzes: quizzes.filter((q) => q.id !== quizId) });
  },

  clearTakingQuiz: () => set({ takingQuiz: null, submitResult: null }),
}));
