import { create } from 'zustand';
import type { LearningPathItem } from '../api/learningPath';
import * as lpApi from '../api/learningPath';

interface LearningPathStore {
  paths: LearningPathItem[];
  activePath: LearningPathItem | null;
  loading: boolean;
  generating: boolean;

  loadPaths: (workspaceId: string, status?: string) => Promise<void>;
  generatePath: (workspaceId: string, title?: string, focusArea?: string) => Promise<LearningPathItem>;
  setActivePath: (path: LearningPathItem | null) => void;
  markTopicComplete: (pathId: string, topicId: string, completed: boolean) => Promise<void>;
  deletePath: (pathId: string) => Promise<void>;
}

export const useLearningPathStore = create<LearningPathStore>()((set, get) => ({
  paths: [],
  activePath: null,
  loading: false,
  generating: false,

  loadPaths: async (workspaceId, status) => {
    set({ loading: true });
    try {
      const paths = await lpApi.fetchLearningPaths(workspaceId, status);
      set({ paths, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  generatePath: async (workspaceId, title, focusArea) => {
    set({ generating: true });
    try {
      const path = await lpApi.generateLearningPath(workspaceId, title, focusArea);
      const { paths } = get();
      set({ paths: [path, ...paths], activePath: path, generating: false });
      return path;
    } catch {
      set({ generating: false });
      throw new Error('Failed to generate learning path');
    }
  },

  setActivePath: (path) => {
    set({ activePath: path });
  },

  markTopicComplete: async (pathId, topicId, completed) => {
    const updated = await lpApi.updateLearningPathTopic(pathId, topicId, {
      completed: completed ? 1 : 0,
    });
    const { activePath } = get();
    let completedCount = 0;
    if (activePath && activePath.id === pathId) {
      const newTopics = activePath.topics.map((t) =>
        t.id === topicId ? { ...t, completed: updated.completed, completed_at: updated.completed_at } : t
      );
      completedCount = newTopics.filter((t) => t.completed).length;
      const newStatus = completedCount >= activePath.total_topics ? 'completed' : activePath.status;
      set({
        activePath: {
          ...activePath,
          topics: newTopics,
          completed_topics: completedCount,
          status: newStatus,
        },
      });
    }
    // Reload paths list
    const { paths } = get();
    set({
      paths: paths.map((p) =>
        p.id === pathId ? { ...p, completed_topics: completedCount || p.completed_topics } : p
      ),
    });
  },

  deletePath: async (pathId) => {
    await lpApi.deleteLearningPath(pathId);
    const { paths, activePath } = get();
    set({
      paths: paths.filter((p) => p.id !== pathId),
      activePath: activePath?.id === pathId ? null : activePath,
    });
  },
}));
