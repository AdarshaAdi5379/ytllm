import { useEffect, useState, useCallback } from 'react';
import {
  Plus, FolderPlus, FolderOpen, Folder, ChevronRight, ChevronDown,
  Loader2, MoreHorizontal, Pencil, Trash2, Check, X, Youtube, ExternalLink, MessageSquare, Globe, FileText, Code, Github, Shield, Upload, File, AlertCircle,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useVideoStore } from '../../store/useVideoStore';
import { useImportStore } from '../../store/useImportStore';
import { ImportNotifications } from './ImportNotifications';
import { MembersPanel } from './MembersPanel';
import {
  fetchSources, fetchUnfiledSources, deleteSource,
  importYouTubeSource, importWebsiteSource, importMarkdownSource, importTextSource,
  importYouTubeSourceBackground, importWebsiteSourceBackground,
  importMarkdownSourceBackground, importTextSourceBackground,
  importGitHubSourceBackground, previewGitHubRepo,
  uploadDocumentBackground, uploadDocument,
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

  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [newWsName, setNewWsName] = useState('New Workspace');
  const [addingFolder, setAddingFolder] = useState(false);
  const [showWebsiteImport, setShowWebsiteImport] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [importingWebsite, setImportingWebsite] = useState(false);
  const [showMarkdownImport, setShowMarkdownImport] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [markdownTitle, setMarkdownTitle] = useState('');
  const [importingMarkdown, setImportingMarkdown] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [importingText, setImportingText] = useState(false);
  const [importingUpload, setImportingUpload] = useState(false);
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

  const handleImportWebsite = async () => {
    if (!activeWorkspaceId || !websiteUrl.trim()) return;
    const jobId = addJob('website_page', websiteUrl.trim());
    setImportingWebsite(true);
    doBackgroundImport(
      jobId,
      importWebsiteSourceBackground(activeWorkspaceId, websiteUrl.trim()),
      () => { setImportingWebsite(false); setWebsiteUrl(''); setShowWebsiteImport(false); },
    );
  };

  const handleImportMarkdown = async () => {
    if (!activeWorkspaceId || !markdownContent.trim()) return;
    const title = markdownTitle.trim() || 'Markdown note';
    const jobId = addJob('markdown_note', title);
    setImportingMarkdown(true);
    doBackgroundImport(
      jobId,
      importMarkdownSourceBackground(activeWorkspaceId, markdownContent.trim(), markdownTitle.trim()),
      () => { setImportingMarkdown(false); setMarkdownContent(''); setMarkdownTitle(''); setShowMarkdownImport(false); },
    );
  };

  const handleImportText = async () => {
    if (!activeWorkspaceId || !textContent.trim()) return;
    const title = textTitle.trim() || 'Text note';
    const jobId = addJob('text_note', title);
    setImportingText(true);
    doBackgroundImport(
      jobId,
      importTextSourceBackground(activeWorkspaceId, textContent.trim(), textTitle.trim()),
      () => { setImportingText(false); setTextContent(''); setTextTitle(''); setShowTextImport(false); },
    );
  };

  const handleUploadDocument = async (file: File) => {
    if (!activeWorkspaceId) return;
    const jobId = addJob('document_upload', file.name);
    setImportingUpload(true);
    doBackgroundImport(
      jobId,
      uploadDocumentBackground(activeWorkspaceId, file, file.name),
      () => { setImportingUpload(false); },
    );
  };

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

      {/* Add source buttons (workspace-level) */}
      <div className="px-3 mb-1 space-y-1">
        <button
          onClick={openAddVideoModal}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 transition-all"
        >
          <Youtube size={12} />
          <span>Add YouTube Video</span>
        </button>
        <button
          onClick={() => setShowWebsiteImport(!showWebsiteImport)}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 transition-all"
        >
          <Globe size={12} />
          <span>Import Website</span>
        </button>
        {showWebsiteImport && (
          <div className="flex items-center gap-1 pt-1">
            <input
              autoFocus
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleImportWebsite();
                if (e.key === 'Escape') { setShowWebsiteImport(false); setWebsiteUrl(''); }
              }}
              placeholder="https://..."
              className="flex-1 bg-slate-800 text-xs text-white px-1.5 py-1 rounded outline-none border border-slate-600 focus:border-emerald-500"
            />
            <button
              onClick={handleImportWebsite}
              disabled={importingWebsite}
              className="p-0.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
            >
              {importingWebsite ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
            </button>
            <button
              onClick={() => { setShowWebsiteImport(false); setWebsiteUrl(''); }}
              className="p-0.5 text-slate-500 hover:text-slate-300"
            >
              <X size={10} />
            </button>
          </div>
        )}
        <button
          onClick={() => document.getElementById('document-upload-input')?.click()}
          disabled={importingUpload}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 transition-all disabled:opacity-50"
        >
          <Upload size={12} />
          <span>{importingUpload ? 'Uploading...' : 'Upload Document'}</span>
        </button>
        <input
          id="document-upload-input"
          type="file"
          accept=".pdf,.docx,.pptx,.ppt,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadDocument(file);
            e.target.value = '';
          }}
        />
        <div className="text-[10px] text-slate-600 px-1 pt-0.5">PDF, DOCX, PPTX, TXT, MD</div>
        <button
          onClick={() => setShowMarkdownImport(!showMarkdownImport)}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 transition-all"
        >
          <Code size={12} />
          <span>Add Markdown</span>
        </button>
        {showMarkdownImport && (
          <div className="pt-1 space-y-1">
            <input
              value={markdownTitle}
              onChange={(e) => setMarkdownTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setShowMarkdownImport(false); setMarkdownContent(''); setMarkdownTitle(''); }
              }}
              placeholder="Title (optional)"
              className="w-full bg-slate-800 text-xs text-white px-1.5 py-1 rounded outline-none border border-slate-600 focus:border-amber-500"
            />
            <textarea
              autoFocus
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setShowMarkdownImport(false); setMarkdownContent(''); setMarkdownTitle(''); }
              }}
              placeholder="Paste your markdown content here..."
              rows={4}
              className="w-full bg-slate-800 text-xs text-white px-1.5 py-1 rounded outline-none border border-slate-600 focus:border-amber-500 resize-none"
            />
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => { setShowMarkdownImport(false); setMarkdownContent(''); setMarkdownTitle(''); }}
                className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-300"
              >
                <X size={10} className="inline mr-0.5" /> Cancel
              </button>
              <button
                onClick={handleImportMarkdown}
                disabled={importingMarkdown || !markdownContent.trim()}
                className="px-2 py-0.5 text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50 flex items-center gap-1"
              >
                {importingMarkdown ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                {importingMarkdown ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowTextImport(!showTextImport)}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-600/20 text-slate-300 hover:bg-slate-600/30 transition-all"
        >
          <FileText size={12} />
          <span>Add Text</span>
        </button>
        {showTextImport && (
          <div className="pt-1 space-y-1">
            <input
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setShowTextImport(false); setTextContent(''); setTextTitle(''); }
              }}
              placeholder="Title (optional)"
              className="w-full bg-slate-800 text-xs text-white px-1.5 py-1 rounded outline-none border border-slate-600 focus:border-slate-400"
            />
            <textarea
              autoFocus
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setShowTextImport(false); setTextContent(''); setTextTitle(''); }
              }}
              placeholder="Paste your text content here..."
              rows={4}
              className="w-full bg-slate-800 text-xs text-white px-1.5 py-1 rounded outline-none border border-slate-600 focus:border-slate-400 resize-none"
            />
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => { setShowTextImport(false); setTextContent(''); setTextTitle(''); }}
                className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-300"
              >
                <X size={10} className="inline mr-0.5" /> Cancel
              </button>
              <button
                onClick={handleImportText}
                disabled={importingText || !textContent.trim()}
                className="px-2 py-0.5 text-xs text-slate-300 hover:text-white disabled:opacity-50 flex items-center gap-1"
              >
                {importingText ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                {importingText ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowGitHubImport(!showGitHubImport)}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-600/20 text-slate-300 hover:bg-slate-600/30 transition-all"
        >
          <Github size={12} />
          <span>Import GitHub Repo</span>
        </button>
        {showGitHubImport && (
          <div className="pt-1 space-y-1">
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={gitHubUrl}
                onChange={(e) => { setGitHubUrl(e.target.value); setPreviewData(null); setGitHubPreviewError(''); setSelectedGitHubFiles(new Set()); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !previewData) handleGitHubPreview();
                  if (e.key === 'Escape') { setShowGitHubImport(false); setGitHubUrl(''); setPreviewData(null); }
                }}
                placeholder="https://github.com/owner/repo"
                className="flex-1 bg-slate-800 text-xs text-white px-1.5 py-1 rounded outline-none border border-slate-600 focus:border-slate-400"
              />
              {!previewData ? (
                <button
                  onClick={handleGitHubPreview}
                  disabled={previewLoading || !gitHubUrl.trim()}
                  className="px-1.5 py-0.5 text-[10px] bg-slate-700 rounded text-slate-300 hover:text-white disabled:opacity-50"
                >
                  {previewLoading ? <Loader2 size={10} className="animate-spin" /> : 'Preview'}
                </button>
              ) : (
                <button
                  onClick={handleImportGitHub}
                  disabled={importingGitHub}
                  className="p-0.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                  title={selectedGitHubFiles.size > 0 ? `Import ${selectedGitHubFiles.size} files` : 'Import All'}
                >
                  {importingGitHub ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                </button>
              )}
              <button
                onClick={() => { setShowGitHubImport(false); setGitHubUrl(''); setPreviewData(null); setGitHubPreviewError(''); setSelectedGitHubFiles(new Set()); }}
                className="p-0.5 text-slate-500 hover:text-slate-300"
              >
                <X size={10} />
              </button>
            </div>

            {gitHubPreviewError && (
              <div className="flex items-start gap-1 px-1 py-1 text-[10px] text-rose-400/90">
                <AlertCircle size={10} className="mt-0.5 flex-shrink-0" />
                <span>{gitHubPreviewError}</span>
              </div>
            )}

            {previewData && (
              <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] text-slate-400">
                    {selectedGitHubFiles.size}/{previewData.importable_files} files selected
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedGitHubFiles(new Set(previewData.file_tree.filter((e) => e.type === 'blob').map((e) => e.path)));
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-300 px-1"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedGitHubFiles(new Set())}
                      className="text-[10px] text-slate-500 hover:text-slate-300 px-1"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto border-t border-slate-700/50">
                  <GitHubFilePreviewTree
                    entries={previewData.file_tree}
                    selectedFiles={selectedGitHubFiles}
                    onToggle={(path) => {
                      setSelectedGitHubFiles((prev) => {
                        const next = new Set(prev);
                        if (next.has(path)) next.delete(path);
                        else next.add(path);
                        return next;
                      });
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
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
          onImport={handleImportYoutube}
        />
      ))}

      {/* Unfiled sources */}
      {activeWorkspaceId && (
        <div className="px-3 pt-3 pb-1">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Unfiled
            {unfiledSources.length > 0 && (
              <span className="ml-1 text-[10px] text-slate-600 font-mono font-normal">{unfiledSources.length}</span>
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
  let icon = <ExternalLink size={10} className="text-slate-500 flex-shrink-0" />;
  if (source.source_type === 'youtube_video') {
    icon = <Youtube size={10} className="text-red-400 flex-shrink-0" />;
  } else if (source.source_type === 'pdf_document') {
    icon = <FileText size={10} className="text-rose-400 flex-shrink-0" />;
  } else if (source.source_type === 'website_page') {
    icon = <Globe size={10} className="text-emerald-400 flex-shrink-0" />;
  } else if (source.source_type === 'markdown_note') {
    icon = <Code size={10} className="text-amber-400 flex-shrink-0" />;
  } else if (source.source_type === 'text_note') {
    icon = <FileText size={10} className="text-slate-400 flex-shrink-0" />;
  } else if (source.source_type === 'docx_document') {
    icon = <FileText size={10} className="text-blue-400 flex-shrink-0" />;
  } else if (source.source_type === 'pptx_document') {
    icon = <FileText size={10} className="text-orange-400 flex-shrink-0" />;
  } else if (source.source_type === 'github_repo') {
    icon = <Github size={10} className="text-slate-300 flex-shrink-0" />;
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
