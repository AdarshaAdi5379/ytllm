import { useState } from 'react';
import { X, FolderTree, ChevronDown, ChevronRight } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useChatSessionStore } from '../../store/useChatSessionStore';
import { useStandaloneChatStore } from '../../store/useStandaloneChatStore';
import type { FolderTreeItem } from '../../api/workspace';

interface Props {
  sessionId: string;
  sessionTitle: string;
  onClose: () => void;
  onMoved: (workspaceId: string) => void;
}

function FolderOption({
  folder,
  depth,
  selectedId,
  onSelect,
}: {
  folder: FolderTreeItem;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = folder.children.length > 0;
  const isSelected = selectedId === folder.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors ${
          isSelected ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 rounded hover:bg-gray-200"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <FolderTree size={14} className="text-gray-400 shrink-0" />
        <span className="truncate">{folder.name}</span>
      </div>
      {expanded &&
        folder.children.map((child) => (
          <FolderOption
            key={child.id}
            folder={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

export function MoveToWorkspaceDialog({ sessionId, sessionTitle, onClose, onMoved }: Props) {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const folderTree = useWorkspaceStore((s) => s.folderTree);
  const loadFolderTree = useWorkspaceStore((s) => s.loadFolderTree);
  const addSession = useChatSessionStore((s) => s.addSession);
  const moveSession = useStandaloneChatStore((s) => s.moveSession);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaces[0]?.id ?? '');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWorkspaceChange = async (wsId: string) => {
    setSelectedWorkspaceId(wsId);
    setSelectedFolderId(null);
    await loadFolderTree(wsId);
  };

  const handleMove = async () => {
    if (!selectedWorkspaceId) return;
    setMoving(true);
    setError(null);
    try {
      const result = await moveSession(sessionId, selectedWorkspaceId, selectedFolderId ?? undefined);
      onMoved(selectedWorkspaceId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move session');
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Move to Workspace</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500 truncate">
            Moving: <span className="font-medium text-gray-700">{sessionTitle}</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Workspace</label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => handleWorkspaceChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Folder (optional)</label>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              <div
                className={`flex items-center gap-2 py-1.5 px-2 text-sm cursor-pointer transition-colors ${
                  selectedFolderId === null ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedFolderId(null)}
              >
                <FolderTree size={14} className="text-gray-400 shrink-0" />
                <span>No folder (root)</span>
              </div>
              {folderTree.map((folder) => (
                <FolderOption
                  key={folder.id}
                  folder={folder}
                  depth={0}
                  selectedId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                />
              ))}
              {folderTree.length === 0 && (
                <p className="text-xs text-gray-400 px-3 py-2">No folders in this workspace</p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleMove}
            disabled={!selectedWorkspaceId || moving}
            className="w-full py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {moving ? 'Moving...' : 'Move Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
