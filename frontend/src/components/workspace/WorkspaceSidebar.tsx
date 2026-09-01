import { useEffect, useState, useCallback } from 'react';
import {
  Plus, FolderPlus, FolderOpen, Folder, ChevronRight, ChevronDown,
  Loader2, MoreHorizontal, Pencil, Trash2, Check, X, Youtube, ExternalLink, MessageSquare, Globe, FileText, Code, Github, Shield, File, AlertCircle,
  Zap, Brain, BookOpen, GraduationCap, BarChart3, Sparkles,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useVideoStore } from '../../store/useVideoStore';
import { useAppStore } from '../../store/useAppStore';
import { useImportStore } from '../../store/useImportStore';
import { ImportNotifications } from './ImportNotifications';
import { MembersPanel } from './MembersPanel';
import { AddSourceMenu } from '../shared/AddSourceMenu';
import {
  fetchSources, fetchUnfiledSources, deleteSource,
  importYouTubeSourceBackground,
  importWebsiteSourceBackground,
  importMarkdownSourceBackground, importTextSourceBackground,
  importGitHubSourceBackground, previewGitHubRepo,
  uploadDocumentBackground,
  pollImportTask,
  type FolderTreeItem, type SourceItem,
} from '../../api/workspace';
import { GitHubFileTree } from './GitHubFileTree';
import type { GitHubPreviewResponse, FileTreeEntry } from '../../api/workspace';

export function WorkspaceSidebarContent() {
  const {
    workspaces, activeWorkspaceId, folderTree, loading, error,
    loadWorkspaces, setActiveWorkspace, createWorkspace, renameWorkspace, removeWorkspace,
    createFolder, renameFolder, removeFolder, loadFolderTree,
  } = useWorkspaceStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAddVideoModal = useVideoStore((s) => s.openAddVideoModal);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);

  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [newWsName, setNewWsName] = useState('New Workspace');
  const [addingFolder, setAddingFolder] = useState(false);
  const [showGitHubImport, setShowGitHubImport] = useState(false);
  const [gitHubUrl, setGitHubUrl] = useState('');
  const [importingGitHub, setImportingGitHub] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<GitHubPreviewResponse | null>(null);
  const [gitHubPreviewError, setGitHubPreviewError] = useState('');
  const [selectedGitHubFiles, setSelectedGitHubFiles] = useState<Set<string>>(new Set());
  const [showWsSwitcher, setShowWsSwitcher] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [unfiledSources, setUnfiledSources] = useState<SourceItem[]>([]);
  const [loadingUnfiled, setLoadingUnfiled] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadWorkspaces();
    }
  }, [isAuthenticated]);

  const { addJob, setJobDone, setJobFailed, updateJob } = useImportStore();

  const loadUnfiledSources = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoadingUnfiled(true);
    try {
      const items = await fetchUnfiledSources(activeWorkspaceId);
      setUnfiledSources(items);
    } catch {
      setUnfiledSources([]);
    } finally {
      setLoadingUnfiled(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadUnfiledSources();
    }
  }, [activeWorkspaceId]);

  const doBackgroundImport = async (
    jobId: string,
    importPromise: Promise<any>,
    onCleanup?: () => void,
  ) => {
    try {
      const result = await importPromise;
      updateJob(jobId, { taskId: result.task_id });
      await pollImportTask(
        result.task_id,
        2000,
        (progress) => updateJob(jobId, { progress }),
      );
      setJobDone(jobId);
      await loadFolderTree(activeWorkspaceId!);
      loadUnfiledSources();
    } catch (err: any) {
      setJobFailed(jobId, err.message || 'Import failed');
    } finally {
      onCleanup?.();
    }
  };

  const handleImportYoutube = useCallback(async (url: string, folderId?: string) => {
    if (!activeWorkspaceId || !url.trim()) return;
    const jobId = addJob('youtube_video', url.trim());
    doBackgroundImport(
      jobId,
      importYouTubeSourceBackground(activeWorkspaceId, url.trim(), folderId),
    );
  }, [activeWorkspaceId, loadFolderTree]);

  const handleImportGitHub = async () => {
    if (!activeWorkspaceId || !gitHubUrl.trim()) return;
    const title = previewData ? `${previewData.owner}/${previewData.repo}` : gitHubUrl.trim();
    const jobId = addJob('github_repo', title);
    setImportingGitHub(true);
    const filePaths = selectedGitHubFiles.size > 0 ? Array.from(selectedGitHubFiles) : undefined;
    doBackgroundImport(
      jobId,
      importGitHubSourceBackground(activeWorkspaceId, gitHubUrl.trim(), undefined, filePaths),
      () => {
        setImportingGitHub(false);
        setGitHubUrl('');
        setShowGitHubImport(false);
        setPreviewData(null);
        setSelectedGitHubFiles(new Set());
      },
    );
  };

  const handleGitHubPreview = async () => {
    if (!gitHubUrl.trim()) return;
    setPreviewLoading(true);
    setPreviewData(null);
    setGitHubPreviewError('');
    setSelectedGitHubFiles(new Set());
    try {
      const data = await previewGitHubRepo(gitHubUrl.trim());
      setPreviewData(data);
      setSelectedGitHubFiles(new Set(data.file_tree.filter((e) => e.type === 'blob').map((e) => e.path)));
    } catch (err: any) {
      setPreviewData(null);
      setGitHubPreviewError(err?.message || 'Preview failed. Check the URL or try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

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

  const handleAddFolder = async () => {
    if (!activeWorkspaceId || !newFolderName.trim()) return;
    await createFolder(activeWorkspaceId, newFolderName.trim());
    setNewFolderName('');
    setAddingFolder(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
      {/* Workspace switcher */}
      <div className="px-3 mb-2 relative">
        <button
          onClick={() => setShowWsSwitcher(!showWsSwitcher)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/50 text-white hover:bg-slate-700/50 transition-all"
        >
          <FolderOpen size={12} className="text-indigo-400" />
          <span className="flex-1 truncate text-left">
            {workspaces.find((w) => w.id === activeWorkspaceId)?.name || 'Select workspace'}
          </span>
          <ChevronRight
            size={12}
            className={`text-slate-500 transition-transform ${showWsSwitcher ? 'rotate-90' : ''}`}
          />
        </button>

        {showWsSwitcher && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowWsSwitcher(false)}
            />
            <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
              {workspaces.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No workspaces</p>
              ) : (
                <div className="py-1">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspace(ws.id);
                        setShowWsSwitcher(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-all ${
                        ws.id === activeWorkspaceId
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <FolderOpen size={11} />
                      <span className="flex-1 truncate text-left">{ws.name}</span>
                      {ws.id === activeWorkspaceId && <Check size={10} className="text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t border-slate-700">
                {isCreatingWs ? (
                  <div className="flex items-center gap-1 px-3 py-1.5">
                    <input
                      autoFocus
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          createWorkspace(newWsName.trim() || 'New Workspace');
                          setShowWsSwitcher(false);
                          setIsCreatingWs(false);
                          setNewWsName('New Workspace');
                        }
                        if (e.key === 'Escape') {
                          setIsCreatingWs(false);
                          setNewWsName('New Workspace');
                        }
                      }}
                      placeholder="Workspace name"
                      className="flex-1 bg-slate-800 text-xs text-white px-1.5 py-1 rounded outline-none border border-slate-600 focus:border-indigo-500"
                    />
                    <button
                      onClick={() => {
                        createWorkspace(newWsName.trim() || 'New Workspace');
                        setShowWsSwitcher(false);
                        setIsCreatingWs(false);
                        setNewWsName('New Workspace');
                      }}
                      className="p-0.5 text-emerald-400 hover:text-emerald-300"
                    >
                      <Check size={10} />
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingWs(false);
                        setNewWsName('New Workspace');
                      }}
                      className="p-0.5 text-slate-500 hover:text-slate-300"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreatingWs(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                  >
                    <Plus size={11} />
                    New Workspace
                  </button>
                )}
                {activeWorkspaceId && (
                  <button
                    onClick={() => {
                      setShowMembers(true);
                      setShowWsSwitcher(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                  >
                    <Shield size={11} />
                    Share
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add source */}
      <div className="px-3 mb-1">
        <AddSourceMenu
          onYouTubeImport={openAddVideoModal}
          onWebsiteImport={async (url) => {
            if (!activeWorkspaceId) return;
            const jobId = addJob('website_page', url);
            doBackgroundImport(jobId, importWebsiteSourceBackground(activeWorkspaceId, url));
          }}
          onDocumentUpload={async (file) => {
            if (!activeWorkspaceId) return;
            const jobId = addJob('document_upload', file.name);
            doBackgroundImport(jobId, uploadDocumentBackground(activeWorkspaceId, file, file.name));
          }}
          onMarkdownImport={async (title, content) => {
            if (!activeWorkspaceId) return;
            const jobId = addJob('markdown_note', title);
            doBackgroundImport(jobId, importMarkdownSourceBackground(activeWorkspaceId, content, title));
          }}
          onTextImport={async (title, content) => {
            if (!activeWorkspaceId) return;
            const jobId = addJob('text_note', title);
            doBackgroundImport(jobId, importTextSourceBackground(activeWorkspaceId, content, title));
          }}
          onGitHubImport={async (url) => {
            setGitHubUrl(url);
            setShowGitHubImport(true);
          }}
          disabled={!activeWorkspaceId}
        />
      </div>

      {/* Folders */}
      <div className="px-3 mb-2 flex items-center justify-between">
        <span className="text-[10px] font-medium text-slate-500">Folders</span>
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
          onImport={handleImportYoutube}
        />
      ))}

      {/* Unfiled sources */}
      {activeWorkspaceId && (
        <div className="px-3 pt-3 pb-1">
          <span className="text-[10px] font-medium text-slate-500">
            Unfiled sources
            {unfiledSources.length > 0 && (
              <span className="ml-1 text-[10px] text-slate-600 font-mono">{unfiledSources.length}</span>
            )}
          </span>
        </div>
      )}
      {loadingUnfiled && (
        <div className="flex items-center justify-center py-2">
          <Loader2 size={10} className="animate-spin text-slate-500" />
        </div>
      )}
      {!loadingUnfiled && unfiledSources.length === 0 && activeWorkspaceId && (
        <div className="px-6 py-3 text-center">
          <p className="text-[10px] text-slate-600">No unfiled sources</p>
        </div>
      )}
      {unfiledSources.map((source) => (
        <div key={source.id} className="px-3">
          <SourceItemRow
            source={source}
            depth={0}
            onDelete={async () => {
              await deleteSource(activeWorkspaceId!, source.id);
              setUnfiledSources((prev) => prev.filter((s) => s.id !== source.id));
            }}
          />
        </div>
      ))}

      {/* Learning section */}
      <div className="px-3 pt-3 pb-1">
        <span className="text-[10px] font-medium text-slate-500">Learning</span>
      </div>
      <div className="px-3 pb-2 space-y-0.5">
        {([
          { mode: 'flashcard' as const, icon: <Zap size={12} />, label: 'Flashcards' },
          { mode: 'quiz' as const, icon: <Brain size={12} />, label: 'Quiz' },
          { mode: 'path' as const, icon: <BookOpen size={12} />, label: 'Learning Path' },
          { mode: 'revision' as const, icon: <GraduationCap size={12} />, label: 'Daily Revision' },
          { mode: 'progress' as const, icon: <BarChart3 size={12} />, label: 'Progress' },
          { mode: 'mentor' as const, icon: <Sparkles size={12} />, label: 'Mentor' },
        ]).map((item) => (
          <button
            key={item.mode}
            onClick={() => setViewMode(item.mode)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
              viewMode === item.mode
                ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-300'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <ImportNotifications />
      {showMembers && <MembersPanel onClose={() => setShowMembers(false)} />}
    </div>
  );
}

function FolderTreeNode({
  folder,
  workspaceId,
  depth = 0,
  onRename,
  onDelete,
  onImport,
}: {
  folder: FolderTreeItem;
  workspaceId: string;
  depth?: number;
  onRename: (wsId: string, folderId: string, name: string) => Promise<void>;
  onDelete: (wsId: string, folderId: string) => Promise<void>;
  onImport: (url: string, folderId?: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [showMenu, setShowMenu] = useState(false);
  const { setActiveFolder } = useWorkspaceStore();
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [showImportInput, setShowImportInput] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const hasChildren = folder.children.length > 0;

  const handleRename = async () => {
    if (editName.trim() && editName.trim() !== folder.name) {
      await onRename(workspaceId, folder.id, editName.trim());
    }
    setEditing(false);
  };

  const loadSources = useCallback(async () => {
    setLoadingSources(true);
    try {
      const items = await fetchSources(workspaceId, folder.id);
      setSources(items);
    } catch {
      setSources([]);
    } finally {
      setLoadingSources(false);
    }
  }, [workspaceId, folder.id]);

  useEffect(() => {
    if (expanded && folder.source_count > 0 && sources.length === 0) {
      loadSources();
    }
  }, [expanded, folder.source_count]);

  const handleDeleteSource = async (sourceId: string) => {
    await deleteSource(workspaceId, sourceId);
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      await onImport(importUrl.trim(), folder.id);
      setImportUrl('');
      setShowImportInput(false);
      await loadSources();
    } catch {
      // handled by parent
    } finally {
      setImporting(false);
    }
  };

  const toggleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && sources.length === 0 && folder.source_count > 0) {
      await loadSources();
    }
  };

  return (
    <div>
      {/* Folder row */}
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs group hover:bg-slate-800/50 transition-all cursor-pointer"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button onClick={toggleExpand} className="p-0.5 text-slate-500 hover:text-slate-300">
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        ) : (
          <button onClick={toggleExpand} className="p-0.5 text-slate-500 hover:text-slate-300">
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        )}

        {expanded ? <FolderOpen size={12} className="text-amber-400 flex-shrink-0" /> : <Folder size={12} className="text-amber-400 flex-shrink-0" />}

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

        {folder.source_count > 0 && (
          <span className="text-[10px] text-slate-600 font-mono">{folder.source_count}</span>
        )}

        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          <button
            onClick={() => { setShowImportInput(!showImportInput); setShowMenu(false); }}
            className="p-0.5 text-slate-500 hover:text-emerald-400"
            title="Import YouTube"
          >
            <Plus size={10} />
          </button>
          <button onClick={() => setShowMenu(!showMenu)} className="p-0.5 text-slate-500 hover:text-slate-300">
            <MoreHorizontal size={10} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-4 z-20 bg-slate-800 rounded-lg border border-slate-700 shadow-xl py-1 min-w-[100px]">
                <button
                    onClick={() => { setActiveFolder(folder.id, folder.name); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    <MessageSquare size={10} /> Chat with folder
                  </button>
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

      {/* Inline YouTube import input */}
      {showImportInput && (
        <div
          className="flex items-center gap-1 py-1"
          style={{ paddingLeft: `${28 + depth * 16}px` }}
        >
          <input
            autoFocus
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleImport();
              if (e.key === 'Escape') { setShowImportInput(false); setImportUrl(''); }
            }}
            placeholder="YouTube URL..."
            className="flex-1 bg-slate-800 text-xs text-white px-1.5 py-1 rounded outline-none border border-slate-600 focus:border-indigo-500"
          />
          <button
            onClick={handleImport}
            disabled={importing}
            className="p-0.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
          >
            {importing ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
          </button>
          <button
            onClick={() => { setShowImportInput(false); setImportUrl(''); }}
            className="p-0.5 text-slate-500 hover:text-slate-300"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Sources list */}
      {expanded && (
        <div>
          {loadingSources && (
            <div className="flex items-center justify-center py-2" style={{ paddingLeft: `${28 + depth * 16}px` }}>
              <Loader2 size={10} className="animate-spin text-slate-500" />
            </div>
          )}
          {!loadingSources && sources.length > 0 && (
            <div className="space-y-0.5 py-0.5">
              {sources.map((source) => (
                <SourceItemRow
                  key={source.id}
                  source={source}
                  depth={depth + 1}
                  onDelete={() => handleDeleteSource(source.id)}
                />
              ))}
            </div>
          )}
          {!loadingSources && sources.length === 0 && folder.source_count > 0 && (
            <div
              className="text-[10px] text-slate-600 py-1"
              style={{ paddingLeft: `${28 + depth * 16}px` }}
            >
              No sources loaded. Click + to add.
            </div>
          )}

          {/* Child folders */}
          {hasChildren && (
            <div>
              {folder.children.map((child) => (
                <FolderTreeNode
                  key={child.id}
                  folder={child}
                  workspaceId={workspaceId}
                  depth={depth + 1}
                  onRename={onRename}
                  onDelete={onDelete}
                  onImport={onImport}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourceItemRow({
  source,
  depth,
  onDelete,
}: {
  source: SourceItem;
  depth: number;
  onDelete: () => void;
}) {
  let meta: Record<string, any> = {};
  try { meta = JSON.parse(source.metadata_json); } catch {}
  let icon = <ExternalLink size={10} className="text-slate-400 flex-shrink-0" />;
  if (source.source_type === 'youtube_video') {
    icon = <Youtube size={10} className="text-slate-400 flex-shrink-0" />;
  } else if (source.source_type === 'pdf_document') {
    icon = <FileText size={10} className="text-slate-400 flex-shrink-0" />;
  } else if (source.source_type === 'website_page') {
    icon = <Globe size={10} className="text-slate-400 flex-shrink-0" />;
  } else if (source.source_type === 'markdown_note') {
    icon = <Code size={10} className="text-slate-400 flex-shrink-0" />;
  } else if (source.source_type === 'text_note') {
    icon = <FileText size={10} className="text-slate-400 flex-shrink-0" />;
  } else if (source.source_type === 'docx_document') {
    icon = <FileText size={10} className="text-slate-400 flex-shrink-0" />;
  } else if (source.source_type === 'pptx_document') {
    icon = <FileText size={10} className="text-slate-400 flex-shrink-0" />;
  } else if (source.source_type === 'github_repo') {
    icon = <Github size={10} className="text-slate-400 flex-shrink-0" />;
  }
  const { activeSourceId, setActiveSource } = useWorkspaceStore();
  const isFocused = activeSourceId === source.id;

  return (
    <>
    <div className="flex items-center gap-0.5 group" style={{ paddingLeft: `${28 + depth * 16}px` }}>
      <div
        className={`flex items-center gap-1.5 flex-1 px-1.5 py-1 rounded-lg text-xs cursor-pointer transition-all ${
          isFocused
            ? 'bg-indigo-500/20 text-indigo-300'
            : 'hover:bg-slate-800/30 text-slate-400'
        }`}
        onClick={() => setActiveSource(
          isFocused ? null : source.id,
          isFocused ? "" : source.title
        )}
      >
        {icon}
        <span className="flex-1 truncate">{source.title}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-0.5 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all flex-shrink-0"
          title="Remove source"
        >
          <Trash2 size={9} />
        </button>
      </div>
    </div>
    {isFocused && source.source_type === 'github_repo' && (
      <GitHubFileTree sourceId={source.id} />
    )}
    </>
  );
}

// Preview tree with checkboxes for file selection
interface PreviewNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  size: number;
  language: string;
  children: PreviewNode[];
}

function buildPreviewTree(entries: FileTreeEntry[]): PreviewNode[] {
  const root: PreviewNode[] = [];
  const map = new Map<string, PreviewNode>();
  for (const entry of entries) {
    const parts = entry.path.split('/');
    let current = root;
    let accumulated = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      let node = map.get(accumulated);
      if (!node) {
        const isLast = i === parts.length - 1;
        node = {
          name: part,
          path: accumulated,
          type: isLast ? entry.type : 'tree',
          size: isLast ? entry.size : 0,
          language: isLast ? entry.language : '',
          children: [],
        };
        map.set(accumulated, node);
        current.push(node);
      }
      current = node.children;
    }
  }
  return root;
}

function GitHubFilePreviewTree({
  entries,
  selectedFiles,
  onToggle,
}: {
  entries: FileTreeEntry[];
  selectedFiles: Set<string>;
  onToggle: (path: string) => void;
}) {
  const tree = buildPreviewTree(entries);
  return (
    <div>
      {tree.map((node) => (
        <PreviewTreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedFiles={selectedFiles}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function PreviewTreeNode({
  node,
  depth,
  selectedFiles,
  onToggle,
}: {
  node: PreviewNode;
  depth: number;
  selectedFiles: Set<string>;
  onToggle: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === 'tree') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 w-full px-1 py-0.5 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-800/30 text-left transition-all"
          style={{ paddingLeft: `${4 + depth * 14}px` }}
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <Folder size={10} className="text-amber-500 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && (
          <div>
            {node.children.map((child) => (
              <PreviewTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFiles={selectedFiles}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedFiles.has(node.path);
  return (
    <div
      className="flex items-center gap-1 px-1 py-0.5 text-xs text-slate-500 hover:bg-slate-800/30 transition-all cursor-pointer"
      style={{ paddingLeft: `${4 + depth * 14}px` }}
      onClick={() => onToggle(node.path)}
    >
      <div
        className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 hover:border-slate-400'
        }`}
      >
        {isSelected && <Check size={8} className="text-white" />}
      </div>
      <File size={10} className="text-slate-600 flex-shrink-0" />
      <span className="truncate">{node.name}</span>
      {node.language && (
        <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-500 flex-shrink-0 ml-auto">
          {node.language}
        </span>
      )}
    </div>
  );
}
