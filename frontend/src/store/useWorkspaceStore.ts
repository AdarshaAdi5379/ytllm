import { create } from 'zustand';
import type { WorkspaceItem, FolderTreeItem } from '../api/workspace';
import * as workspaceApi from '../api/workspace';

interface WorkspaceStore {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
  activeSourceId: string | null;
  activeSourceTitle: string;
  activeFolderId: string | null;
  activeFolderTitle: string;
  folderTree: FolderTreeItem[];
  loading: boolean;
  error: string | null;

  loadWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<WorkspaceItem>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  removeWorkspace: (id: string) => Promise<void>;

  loadFolderTree: (workspaceId: string) => Promise<void>;
  createFolder: (workspaceId: string, name: string, parentId?: string) => Promise<void>;
  renameFolder: (workspaceId: string, folderId: string, name: string) => Promise<void>;
  removeFolder: (workspaceId: string, folderId: string) => Promise<void>;

  setActiveSource: (sourceId: string | null, sourceTitle?: string) => void;
  clearActiveSource: () => void;
  setActiveFolder: (folderId: string | null, folderTitle?: string) => void;
  clearActiveFolder: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  activeSourceId: null,
  activeSourceTitle: "",
  activeFolderId: null,
  activeFolderTitle: "",
  folderTree: [],
  loading: false,
  error: null,

  loadWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const workspaces = await workspaceApi.fetchWorkspaces();
      const state: Partial<WorkspaceStore> = { workspaces, loading: false };
      const { activeWorkspaceId } = get();
      if (workspaces.length > 0 && !activeWorkspaceId) {
        state.activeWorkspaceId = workspaces[0].id;
      }
      set(state);
      if (state.activeWorkspaceId) {
        get().loadFolderTree(state.activeWorkspaceId);
      }
    } catch (err: any) {
      set({ loading: false, error: err.message ?? 'Failed to load workspaces' });
    }
  },

  setActiveWorkspace: async (id: string) => {
    set({ activeWorkspaceId: id, folderTree: [], activeSourceId: null, activeSourceTitle: "", activeFolderId: null, activeFolderTitle: "" });
    await get().loadFolderTree(id);
  },

  createWorkspace: async (name: string) => {
    const ws = await workspaceApi.createWorkspace(name);
    await get().loadWorkspaces();
    set({ activeWorkspaceId: ws.id });
    return ws;
  },

  renameWorkspace: async (id: string, name: string) => {
    await workspaceApi.updateWorkspace(id, name);
    await get().loadWorkspaces();
  },

  removeWorkspace: async (id: string) => {
    await workspaceApi.deleteWorkspace(id);
    const { workspaces, activeWorkspaceId } = get();
    if (activeWorkspaceId === id) {
      const remaining = workspaces.filter((w) => w.id !== id);
      set({ activeWorkspaceId: remaining[0]?.id ?? null });
    }
    await get().loadWorkspaces();
  },

  loadFolderTree: async (workspaceId: string) => {
    try {
      const tree = await workspaceApi.fetchFolderTree(workspaceId);
      set({ folderTree: tree });
    } catch (err: any) {
      set({ error: err.message ?? 'Failed to load folders' });
    }
  },

  createFolder: async (workspaceId: string, name: string, parentId?: string) => {
    await workspaceApi.createFolder(workspaceId, name, parentId);
    await get().loadFolderTree(workspaceId);
  },

  renameFolder: async (workspaceId: string, folderId: string, name: string) => {
    await workspaceApi.updateFolder(workspaceId, folderId, { name });
    await get().loadFolderTree(workspaceId);
  },

  removeFolder: async (workspaceId: string, folderId: string) => {
    await workspaceApi.deleteFolder(workspaceId, folderId);
    await get().loadFolderTree(workspaceId);
  },

  setActiveSource: (sourceId: string | null, sourceTitle: string = "") => {
    set({ activeSourceId: sourceId, activeSourceTitle: sourceTitle, activeFolderId: null, activeFolderTitle: "" });
  },

  clearActiveSource: () => {
    set({ activeSourceId: null, activeSourceTitle: "" });
  },

  setActiveFolder: (folderId: string | null, folderTitle: string = "") => {
    set({ activeFolderId: folderId, activeFolderTitle: folderTitle, activeSourceId: null, activeSourceTitle: "" });
  },

  clearActiveFolder: () => {
    set({ activeFolderId: null, activeFolderTitle: "" });
  },
}));
