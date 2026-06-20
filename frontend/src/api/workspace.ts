import { apiFetch } from './client';

// --- Types (matching snake_case backend) ---

export interface WorkspaceItem {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FolderItem {
  id: string;
  workspace_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FolderTreeItem {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  children: FolderTreeItem[];
  source_count: number;
}

// --- Workspace API ---

export async function fetchWorkspaces(): Promise<WorkspaceItem[]> {
  return apiFetch<WorkspaceItem[]>('/workspace/');
}

export async function createWorkspace(name: string): Promise<WorkspaceItem> {
  return apiFetch<WorkspaceItem>('/workspace/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function getWorkspace(id: string): Promise<WorkspaceItem> {
  return apiFetch<WorkspaceItem>(`/workspace/${id}`);
}

export async function updateWorkspace(id: string, name: string): Promise<WorkspaceItem> {
  return apiFetch<WorkspaceItem>(`/workspace/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteWorkspace(id: string): Promise<void> {
  await apiFetch(`/workspace/${id}`, { method: 'DELETE' });
}

// --- Folder API ---

export async function fetchFolderTree(workspaceId: string): Promise<FolderTreeItem[]> {
  return apiFetch<FolderTreeItem[]>(`/workspace/${workspaceId}/folders/`);
}

export async function fetchFoldersFlat(workspaceId: string): Promise<FolderItem[]> {
  return apiFetch<FolderItem[]>(`/workspace/${workspaceId}/folders/flat`);
}

export async function createFolder(
  workspaceId: string,
  name: string,
  parentId?: string,
): Promise<FolderItem> {
  return apiFetch<FolderItem>(`/workspace/${workspaceId}/folders/`, {
    method: 'POST',
    body: JSON.stringify({ name, parent_id: parentId ?? null }),
  });
}

export async function getFolder(workspaceId: string, folderId: string): Promise<FolderItem> {
  return apiFetch<FolderItem>(`/workspace/${workspaceId}/folders/${folderId}`);
}

export async function updateFolder(
  workspaceId: string,
  folderId: string,
  data: { name?: string; sort_order?: number; parent_id?: string | null },
): Promise<FolderItem> {
  return apiFetch<FolderItem>(`/workspace/${workspaceId}/folders/${folderId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteFolder(workspaceId: string, folderId: string): Promise<void> {
  await apiFetch(`/workspace/${workspaceId}/folders/${folderId}`, { method: 'DELETE' });
}

// --- Source API ---

export interface SourceItem {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  source_type: string;
  title: string;
  metadata_json: string;
  raw_text: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchSources(workspaceId: string, folderId?: string): Promise<SourceItem[]> {
  const params = folderId ? `?folder_id=${folderId}` : '';
  return apiFetch<SourceItem[]>(`/workspace/${workspaceId}/sources/${params}`);
}

export async function getSource(workspaceId: string, sourceId: string): Promise<SourceItem> {
  return apiFetch<SourceItem>(`/workspace/${workspaceId}/sources/${sourceId}`);
}

export async function deleteSource(workspaceId: string, sourceId: string): Promise<void> {
  await apiFetch(`/workspace/${workspaceId}/sources/${sourceId}`, { method: 'DELETE' });
}

export async function importYouTubeSource(
  workspaceId: string,
  url: string,
  folderId?: string,
): Promise<SourceItem> {
  return apiFetch<SourceItem>('/sources/youtube/import', {
    method: 'POST',
    body: JSON.stringify({
      url,
      workspace_id: workspaceId,
      folder_id: folderId ?? null,
    }),
  });
}
