import { useState, useRef, useEffect } from 'react';
import { Plus, Youtube, Globe, Upload, FileText, Code, Github, Loader2, X, Check, ChevronDown } from 'lucide-react';

type SourceType = 'youtube' | 'website' | 'document' | 'markdown' | 'text' | 'github';

interface AddSourceMenuProps {
  onYouTubeImport: () => void;
  onWebsiteImport: (url: string) => Promise<void>;
  onDocumentUpload: (file: File) => Promise<void>;
  onMarkdownImport: (title: string, content: string) => Promise<void>;
  onTextImport: (title: string, content: string) => Promise<void>;
  onGitHubImport: (url: string) => Promise<void>;
  disabled?: boolean;
}

export function AddSourceMenu({
  onYouTubeImport,
  onWebsiteImport,
  onDocumentUpload,
  onMarkdownImport,
  onTextImport,
  onGitHubImport,
  disabled,
}: AddSourceMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState<SourceType | null>(null);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveType(null);
        setUrl('');
        setText('');
        setTitle('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const reset = () => {
    setActiveType(null);
    setUrl('');
    setText('');
    setTitle('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (activeType === 'website' && url.trim()) {
        await onWebsiteImport(url.trim());
        setUrl('');
      } else if (activeType === 'markdown' && text.trim()) {
        await onMarkdownImport(title.trim() || 'Untitled', text);
        setText('');
        setTitle('');
      } else if (activeType === 'text' && text.trim()) {
        await onTextImport(title.trim() || 'Untitled', text);
        setText('');
        setTitle('');
      } else if (activeType === 'github' && url.trim()) {
        await onGitHubImport(url.trim());
        setUrl('');
      }
      setOpen(false);
      reset();
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      await onDocumentUpload(file);
      setOpen(false);
      reset();
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const menuItems: { type: SourceType; icon: JSX.Element; label: string; desc: string }[] = [
    { type: 'youtube', icon: <Youtube size={14} />, label: 'YouTube Video', desc: 'Paste a YouTube URL' },
    { type: 'website', icon: <Globe size={14} />, label: 'Website', desc: 'Import a web page' },
    { type: 'document', icon: <Upload size={14} />, label: 'Document', desc: 'PDF, DOCX, PPTX, TXT, MD' },
    { type: 'markdown', icon: <Code size={14} />, label: 'Markdown', desc: 'Paste markdown content' },
    { type: 'text', icon: <FileText size={14} />, label: 'Plain Text', desc: 'Paste text content' },
    { type: 'github', icon: <Github size={14} />, label: 'GitHub Repo', desc: 'Import a repository' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={14} />
        Add Source
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {!activeType ? (
            <div className="py-1">
              {menuItems.map((item) => (
                <button
                  key={item.type}
                  onClick={() => {
                    if (item.type === 'youtube') {
                      onYouTubeImport();
                      setOpen(false);
                      return;
                    }
                    if (item.type === 'document') {
                      fileRef.current?.click();
                      return;
                    }
                    setActiveType(item.type);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-400">{item.icon}</span>
                  <div>
                    <div className="text-xs font-medium text-gray-700">{item.label}</div>
                    <div className="text-[10px] text-gray-400">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">
                  {menuItems.find((m) => m.type === activeType)?.label}
                </span>
                <button onClick={reset} className="p-0.5 text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              </div>

              {(activeType === 'website' || activeType === 'github') && (
                <input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder={activeType === 'github' ? 'https://github.com/owner/repo' : 'https://...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400"
                />
              )}

              {(activeType === 'markdown' || activeType === 'text') && (
                <>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400"
                  />
                  <textarea
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste content here..."
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 resize-none"
                  />
                </>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || (activeType !== 'document' && !url.trim() && !text.trim())}
                className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium text-white transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                {activeType === 'github' ? 'Preview' : 'Import'}
              </button>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.pptx,.ppt,.txt,.md"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
