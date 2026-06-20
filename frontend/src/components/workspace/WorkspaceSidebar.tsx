import { useEffect, useState } from 'react';
import {
  Plus, FolderPlus, FolderOpen, Folder, ChevronRight, ChevronDown,
  Loader2, MoreHorizontal, Pencil, Trash2, Check, X,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { FolderTreeItem } from '../../api/workspace';

export function WorkspaceSidebarContent() {
  const {
    workspaces, activeWorkspaceId, folderTree, loading, error,
    loadWorkspaces, setActiveWorkspace, createWorkspace, renameWorkspace, removeWorkspace,
    createFolder, renameFolder, removeFolder,
  } = useWorkspaceStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [newFolderName, setNewFolderName] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadWorkspaces();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  if (loading && workspaces.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-xs text-rose-400">{error}</div>
    );
  }

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  const handleAddFolder = async () => {
    if (!activeWorkspaceId || !newFolderName.trim()) return;
    await createFolder(activeWorkspaceId, newFolderName.trim());
    setNewFolderName('');
    setAddingFolder(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
      {/* Workspace switcher */}
      <div className="px-3 mb-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Workspace</span>
          <button
            onClick={() => createWorkspace('New Workspace')}
            className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all"
            title="New workspace"
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="mt-1.5 space-y-0.5">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspace(ws.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                ws.id === activeWorkspaceId
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FolderOpen size={12} />
              <span className="truncate">{ws.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Folders */}
      <div className="px-3 mb-2 flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Folders</span>
        <button
          onClick={() => setAddingFolder(true)}
          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all"
          title="New folder"
        >
          <FolderPlus size={12} />
        </button>
      </div>

      {/* New folder inline form */}
      {addingFolder && (
        <div className="flex items-center gap-1 px-3 py-1">
          <Folder size={12} className="text-slate-500 flex-shrink-0" />
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddFolder();
              if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName(''); }
            }}
            placeholder="Folder name"
            className="flex-1 bg-slate-800 text-xs text-white px-1.5 py-1 rounded outline-none border border-slate-600 focus:border-indigo-500"
          />
          <button onClick={handleAddFolder} className="p-0.5 text-emerald-400 hover:text-emerald-300">
            <Check size={12} />
          </button>
          <button
            onClick={() => { setAddingFolder(false); setNewFolderName(''); }}
            className="p-0.5 text-slate-500 hover:text-slate-300"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Folder tree */}
      {folderTree.length === 0 && !addingFolder && (
        <div className="px-6 py-6 text-center">
          <p className="text-xs text-slate-500">No folders yet</p>
          <p className="text-[10px] text-slate-600 mt-1">Create folders to organize your sources</p>
        </div>
      )}
      {folderTree.map((folder) => (
        <FolderTreeNode
          key={folder.id}
          folder={folder}
          workspaceId={activeWorkspaceId!}
          onRename={renameFolder}
          onDelete={removeFolder}
        />
      ))}
    </div>
  );
}

function FolderTreeNode({
  folder,
  workspaceId,
  depth = 0,
  onRename,
  onDelete,
}: {
  folder: FolderTreeItem;
  workspaceId: string;
  depth?: number;
  onRename: (wsId: string, folderId: string, name: string) => Promise<void>;
  onDelete: (wsId: string, folderId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [showMenu, setShowMenu] = useState(false);

  const hasChildren = folder.children.length > 0;

  const handleRename = async () => {
    if (editName.trim() && editName.trim() !== folder.name) {
      await onRename(workspaceId, folder.id, editName.trim());
    }
    setEditing(false);
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs group hover:bg-slate-800/50 transition-all cursor-pointer"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-slate-500 hover:text-slate-300">
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Folder icon */}
        {expanded ? <FolderOpen size={12} className="text-amber-400 flex-shrink-0" /> : <Folder size={12} className="text-amber-400 flex-shrink-0" />}

        {/* Name */}
        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setEditing(false);
            }}
            onBlur={handleRename}
            className="flex-1 bg-slate-800 text-xs text-white px-1 py-0.5 rounded outline-none border border-slate-600"
          />
        ) : (
          <span
            className="flex-1 truncate text-slate-300"
            onDoubleClick={() => { setEditName(folder.name); setEditing(true); }}
          >
            {folder.name}
          </span>
        )}

        {/* Source count */}
        {folder.source_count > 0 && (
          <span className="text-[10px] text-slate-600 font-mono">{folder.source_count}</span>
        )}

        {/* Context menu */}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setShowMenu(!showMenu)} className="p-0.5 text-slate-500 hover:text-slate-300">
            <MoreHorizontal size={10} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-4 z-20 bg-slate-800 rounded-lg border border-slate-700 shadow-xl py-1 min-w-[100px]">
                <button
                  onClick={() => { setEditName(folder.name); setEditing(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  <Pencil size={10} /> Rename
                </button>
                <button
                  onClick={() => { onDelete(workspaceId, folder.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 size={10} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              workspaceId={workspaceId}
              depth={depth + 1}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
