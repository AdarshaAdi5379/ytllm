import { useEffect, useState, useCallback } from 'react';
import {
  Plus, FolderPlus, FolderOpen, Folder, ChevronRight, ChevronDown,
  Loader2, MoreHorizontal, Pencil, Trash2, Check, X, Youtube, ExternalLink, MessageSquare, Globe, FileText, Code,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useVideoStore } from '../../store/useVideoStore';
import { useImportStore } from '../../store/useImportStore';
import { ImportNotifications } from './ImportNotifications';
import {
  fetchSources, deleteSource, importYouTubeSource, importWebsiteSource, importPdfSource, importMarkdownSource, importTextSource, uploadDocxSource, uploadPptxSource,
  type FolderTreeItem, type SourceItem,
} from '../../api/workspace';

export function WorkspaceSidebarContent() {
  const {
    workspaces, activeWorkspaceId, folderTree, loading, error,
    loadWorkspaces, setActiveWorkspace, createWorkspace, renameWorkspace, removeWorkspace,
    createFolder, renameFolder, removeFolder, loadFolderTree,
  } = useWorkspaceStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAddVideoModal = useVideoStore((s) => s.openAddVideoModal);

  const [newFolderName, setNewFolderName] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);
  const [showWebsiteImport, setShowWebsiteImport] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [importingWebsite, setImportingWebsite] = useState(false);
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [importingPdf, setImportingPdf] = useState(false);
  const [showMarkdownImport, setShowMarkdownImport] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [markdownTitle, setMarkdownTitle] = useState('');
  const [importingMarkdown, setImportingMarkdown] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [importingText, setImportingText] = useState(false);
  const [importingDocx, setImportingDocx] = useState(false);
  const [importingPptx, setImportingPptx] = useState(false);
  const [showWsSwitcher, setShowWsSwitcher] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadWorkspaces();
    }
  }, [isAuthenticated]);

  const { addJob, setJobDone, setJobFailed } = useImportStore();

  const handleImportYoutube = useCallback(async (url: string, folderId?: string) => {
    if (!activeWorkspaceId || !url.trim()) return;
    const jobId = addJob('youtube_video', url.trim());
    try {
      await importYouTubeSource(activeWorkspaceId, url.trim(), folderId);
      setJobDone(jobId);
      await loadFolderTree(activeWorkspaceId);
    } catch (err: any) {
      setJobFailed(jobId, err.message || 'Import failed');
    }
  }, [activeWorkspaceId, loadFolderTree]);

  const handleImportWebsite = async () => {
    if (!activeWorkspaceId || !websiteUrl.trim()) return;
    const jobId = addJob('website_page', websiteUrl.trim());
    setImportingWebsite(true);
    try {
      await importWebsiteSource(activeWorkspaceId, websiteUrl.trim());
      setJobDone(jobId);
      setWebsiteUrl('');
      setShowWebsiteImport(false);
      await loadFolderTree(activeWorkspaceId);
    } catch (err: any) {
      setJobFailed(jobId, err.message || 'Website import failed');
    } finally {
      setImportingWebsite(false);
    }
  };

  const handleImportPdf = async () => {
    if (!activeWorkspaceId || !pdfUrl.trim()) return;
    const jobId = addJob('pdf_document', pdfUrl.trim());
    setImportingPdf(true);
    try {
      await importPdfSource(activeWorkspaceId, pdfUrl.trim());
      setJobDone(jobId);
      setPdfUrl('');
      setShowPdfImport(false);
      await loadFolderTree(activeWorkspaceId);
    } catch (err: any) {
      setJobFailed(jobId, err.message || 'PDF import failed');
    } finally {
      setImportingPdf(false);
    }
  };

  const handleImportMarkdown = async () => {
    if (!activeWorkspaceId || !markdownContent.trim()) return;
    const title = markdownTitle.trim() || 'Markdown note';
    const jobId = addJob('markdown_note', title);
    setImportingMarkdown(true);
    try {
      await importMarkdownSource(activeWorkspaceId, markdownContent.trim(), markdownTitle.trim());
      setJobDone(jobId);
      setMarkdownContent('');
      setMarkdownTitle('');
      setShowMarkdownImport(false);
      await loadFolderTree(activeWorkspaceId);
    } catch (err: any) {
      setJobFailed(jobId, err.message || 'Markdown import failed');
    } finally {
      setImportingMarkdown(false);
    }
  };

  const handleImportText = async () => {
    if (!activeWorkspaceId || !textContent.trim()) return;
    const title = textTitle.trim() || 'Text note';
    const jobId = addJob('text_note', title);
    setImportingText(true);
    try {
      await importTextSource(activeWorkspaceId, textContent.trim(), textTitle.trim());
      setJobDone(jobId);
      setTextContent('');
      setTextTitle('');
      setShowTextImport(false);
      await loadFolderTree(activeWorkspaceId);
    } catch (err: any) {
      setJobFailed(jobId, err.message || 'Text import failed');
    } finally {
      setImportingText(false);
    }
  };

  const handleImportDocx = async (file: File) => {
    if (!activeWorkspaceId) return;
    const jobId = addJob('docx_document', file.name);
    setImportingDocx(true);
    try {
      await uploadDocxSource(activeWorkspaceId, file);
      setJobDone(jobId);
      await loadFolderTree(activeWorkspaceId);
    } catch (err: any) {
      setJobFailed(jobId, err.message || 'DOCX import failed');
    } finally {
      setImportingDocx(false);
    }
  };

  const handleImportPptx = async (file: File) => {
    if (!activeWorkspaceId) return;
    const jobId = addJob('pptx_document', file.name);
    setImportingPptx(true);
    try {
      await uploadPptxSource(activeWorkspaceId, file);
      setJobDone(jobId);
      await loadFolderTree(activeWorkspaceId);
    } catch (err: any) {
      setJobFailed(jobId, err.message || 'PPTX import failed');
    } finally {
      setImportingPptx(false);
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
                <button
                  onClick={() => {
                    createWorkspace('New Workspace');
                    setShowWsSwitcher(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                >
                  <Plus size={11} />
                  New Workspace
                </button>
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
          onClick={() => setShowPdfImport(!showPdfImport)}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 transition-all"
        >
          <FileText size={12} />
          <span>Import PDF</span>
        </button>
        {showPdfImport && (
          <div className="flex items-center gap-1 pt-1">
            <input
              autoFocus
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleImportPdf();
                if (e.key === 'Escape') { setShowPdfImport(false); setPdfUrl(''); }
              }}
              placeholder="https://... (PDF URL)"
              className="flex-1 bg-slate-800 text-xs text-white px-1.5 py-1 rounded outline-none border border-slate-600 focus:border-rose-500"
            />
            <button
              onClick={handleImportPdf}
              disabled={importingPdf}
              className="p-0.5 text-rose-400 hover:text-rose-300 disabled:opacity-50"
            >
              {importingPdf ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
            </button>
            <button
              onClick={() => { setShowPdfImport(false); setPdfUrl(''); }}
              className="p-0.5 text-slate-500 hover:text-slate-300"
            >
              <X size={10} />
            </button>
          </div>
        )}
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
          onClick={() => document.getElementById('docx-file-input')?.click()}
          disabled={importingDocx}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-all disabled:opacity-50"
        >
          <FileText size={12} />
          <span>{importingDocx ? 'Importing...' : 'Import DOCX'}</span>
        </button>
        <input
          id="docx-file-input"
          type="file"
          accept=".docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportDocx(file);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => document.getElementById('pptx-file-input')?.click()}
          disabled={importingPptx}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-600/20 text-orange-300 hover:bg-orange-600/30 transition-all disabled:opacity-50"
        >
          <FileText size={12} />
          <span>{importingPptx ? 'Importing...' : 'Import PPTX'}</span>
        </button>
        <input
          id="pptx-file-input"
          type="file"
          accept=".pptx,.ppt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportPptx(file);
            e.target.value = '';
          }}
        />
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
      <ImportNotifications />
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
  }
  const { activeSourceId, setActiveSource } = useWorkspaceStore();

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs group transition-all cursor-pointer ${
        activeSourceId === source.id
          ? 'bg-indigo-500/20 text-indigo-300'
          : 'hover:bg-slate-800/30 text-slate-400'
      }`}
      style={{ paddingLeft: `${28 + depth * 16}px` }}
      onClick={() => setActiveSource(
        activeSourceId === source.id ? null : source.id,
        activeSourceId === source.id ? "" : source.title
      )}
    >
      {icon}
      <span className="flex-1 truncate">{source.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-0.5 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all"
        title="Remove source"
      >
        <Trash2 size={9} />
      </button>
    </div>
  );
}
