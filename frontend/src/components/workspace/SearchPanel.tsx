import { useState, useMemo } from 'react';
import { Search, Loader2, Youtube, FileText, Globe, Code, ExternalLink, FolderOpen, X, ChevronDown } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { searchWorkspace, type SearchResultItem, type FolderTreeItem } from '../../api/workspace';

const TYPE_ICONS: Record<string, JSX.Element> = {
  youtube_video: <Youtube size={10} className="text-red-400 flex-shrink-0" />,
  pdf_document: <FileText size={10} className="text-rose-400 flex-shrink-0" />,
  website_page: <Globe size={10} className="text-emerald-400 flex-shrink-0" />,
  github_repo: <Code size={10} className="text-slate-300 flex-shrink-0" />,
  markdown_note: <Code size={10} className="text-amber-400 flex-shrink-0" />,
  text_note: <FileText size={10} className="text-slate-400 flex-shrink-0" />,
  docx_document: <FileText size={10} className="text-blue-400 flex-shrink-0" />,
  pptx_document: <FileText size={10} className="text-orange-400 flex-shrink-0" />,
};

const SOURCE_TYPES = [
  { value: '', label: 'All types' },
  { value: 'youtube_video', label: 'YouTube' },
  { value: 'pdf_document', label: 'PDF' },
  { value: 'website_page', label: 'Website' },
  { value: 'github_repo', label: 'GitHub' },
  { value: 'markdown_note', label: 'Markdown' },
  { value: 'text_note', label: 'Text' },
  { value: 'docx_document', label: 'DOCX' },
  { value: 'pptx_document', label: 'PPTX' },
];

function flattenFolders(tree: FolderTreeItem[]): { id: string; name: string; depth: number }[] {
  const out: { id: string; name: string; depth: number }[] = [];
  const walk = (items: FolderTreeItem[], depth: number) => {
    for (const item of items) {
      out.push({ id: item.id, name: item.name, depth });
      walk(item.children, depth + 1);
    }
  };
  walk(tree, 0);
  return out;
}

function getMatchColor(distance: number): string {
  if (distance < 0.3) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
  if (distance < 0.6) return 'text-amber-500 bg-amber-50 border-amber-200';
  return 'text-gray-400 bg-gray-50 border-gray-200';
}

function getMatchLabel(distance: number): string {
  const pct = ((1 - distance) * 100).toFixed(0);
  if (distance < 0.3) return `${pct}% match`;
  if (distance < 0.6) return `${pct}% match`;
  return `${pct}% match`;
}

export function SearchPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const folderTree = useWorkspaceStore((s) => s.folderTree);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [method, setMethod] = useState('');

  const [filterSourceType, setFilterSourceType] = useState('');
  const [filterFolderId, setFilterFolderId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const flatFolders = useMemo(() => flattenFolders(folderTree), [folderTree]);

  const hasActiveFilters = filterSourceType || filterFolderId || filterDateFrom || filterDateTo;

  const handleSearch = async () => {
    if (!activeWorkspaceId || !query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchWorkspace(activeWorkspaceId, query.trim(), {
        sourceType: filterSourceType || undefined,
        folderId: filterFolderId || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      });
      setResults(res.results);
      setMethod(res.method);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterSourceType('');
    setFilterFolderId('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Group results by source
  const groupedResults = useMemo(() => {
    const map = new Map<string, SearchResultItem[]>();
    for (const r of results) {
      const key = r.source_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [results]);

  if (!activeWorkspaceId) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search input */}
      <div className="p-4 border-b border-gray-100 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Search across all sources..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Search
          </button>
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-gray-700 transition-all"
        >
          <ChevronDown size={10} className={`transition-transform ${showFilters ? 'rotate-0' : '-rotate-90'}`} />
          Filters{hasActiveFilters ? ' (active)' : ''}
          {hasActiveFilters && (
            <button
              onClick={(e) => { e.stopPropagation(); clearFilters(); }}
              className="ml-1 p-0.5 text-rose-400 hover:text-rose-600"
            >
              <X size={8} />
            </button>
          )}
        </button>

        {/* Filter bar */}
        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterSourceType}
              onChange={(e) => setFilterSourceType(e.target.value)}
              className="text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={filterFolderId}
              onChange={(e) => setFilterFolderId(e.target.value)}
              className="text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 max-w-[140px]"
            >
              <option value="">All folders</option>
              {flatFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {'  '.repeat(f.depth)}{f.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400"
              title="From date"
            />
            <span className="text-[10px] text-gray-400">-</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400"
              title="To date"
            />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        ) : searched && results.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">No results found.</p>
        ) : searched ? (
          <>
            {/* Result count */}
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                {results.length} result{results.length !== 1 ? 's' : ''} from {groupedResults.length} source{groupedResults.length !== 1 ? 's' : ''}
              </p>
              {method === 'hybrid' && (
                <span className="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full font-semibold">
                  + keyword results
                </span>
              )}
            </div>

            {/* Grouped by source */}
            {groupedResults.map(([sourceId, chunks]) => {
              const first = chunks[0];
              return (
                <div key={sourceId}>
                  {/* Source header */}
                  <div className="flex items-center gap-1.5 px-1 mb-1">
                    {TYPE_ICONS[first.source_type] || <ExternalLink size={10} className="text-slate-500 flex-shrink-0" />}
                    <span className="text-xs font-semibold text-gray-700 truncate">{first.source_title}</span>
                    {first.folder_name && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <FolderOpen size={8} />{first.folder_name}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 ml-auto">{chunks.length} chunk{chunks.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Result cards */}
                  <div className="space-y-1.5">
                    {chunks.map((r, i) => (
                      <div
                        key={i}
                        className="bg-white border border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${getMatchColor(r.distance)}`}>
                            {getMatchLabel(r.distance)}
                          </span>
                          {r.match_type === 'keyword' && (
                            <span className="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full font-semibold">
                              keyword
                            </span>
                          )}
                          {r.created_at && (
                            <span className="text-[10px] text-gray-400 ml-auto">
                              {new Date(r.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        ) : null}
      </div>
    </div>
  );
}
