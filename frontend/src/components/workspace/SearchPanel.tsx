import { useState } from 'react';
import { Search, Loader2, Youtube, FileText, Globe, Code, ExternalLink } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { searchWorkspace, type SearchResultItem } from '../../api/workspace';

const TYPE_ICONS: Record<string, JSX.Element> = {
  youtube_video: <Youtube size={10} className="text-red-400 flex-shrink-0" />,
  pdf_document: <FileText size={10} className="text-rose-400 flex-shrink-0" />,
  website_page: <Globe size={10} className="text-emerald-400 flex-shrink-0" />,
  markdown_note: <Code size={10} className="text-amber-400 flex-shrink-0" />,
  text_note: <FileText size={10} className="text-slate-400 flex-shrink-0" />,
  docx_document: <FileText size={10} className="text-blue-400 flex-shrink-0" />,
  pptx_document: <FileText size={10} className="text-orange-400 flex-shrink-0" />,
};

export function SearchPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!activeWorkspaceId || !query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchWorkspace(activeWorkspaceId, query.trim());
      setResults(res.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (!activeWorkspaceId) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search input */}
      <div className="p-4 border-b border-gray-100">
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
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        ) : searched && results.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">No results found.</p>
        ) : (
          results.map((r, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-all"
            >
              <div className="flex items-center gap-1.5 mb-1">
                {TYPE_ICONS[r.source_type] || <ExternalLink size={10} className="text-slate-500 flex-shrink-0" />}
                <span className="text-xs font-semibold text-gray-700 truncate">{r.source_title}</span>
                <span className="text-[10px] text-gray-400 ml-auto">
                  {(r.distance * 100).toFixed(0)}% match
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{r.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
