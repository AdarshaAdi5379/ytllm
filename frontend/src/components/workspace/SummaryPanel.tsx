import { useEffect, useState, useCallback } from 'react';
import { Loader2, Copy, Check, FileDown, FileText, Trash2, Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import {
  listSummaries, generateSummary, deleteSummary,
  type SummaryItem, type SummaryType, SUMMARY_TYPES, SUMMARY_TYPE_LABELS,
} from '../../api/workspace';

export function SummaryPanel() {
  const activeSourceId = useWorkspaceStore((s) => s.activeSourceId);
  const activeSourceTitle = useWorkspaceStore((s) => s.activeSourceTitle);

  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<SummaryType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<SummaryType>('short');
  const [copied, setCopied] = useState(false);

  const loadSummaries = useCallback(async () => {
    if (!activeSourceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listSummaries(activeSourceId);
      setSummaries(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load summaries');
    } finally {
      setLoading(false);
    }
  }, [activeSourceId]);

  useEffect(() => {
    setSummaries([]);
    setActiveType('short');
    if (activeSourceId) loadSummaries();
  }, [activeSourceId, loadSummaries]);

  const activeSummary = summaries.find((s) => s.type === activeType);

  const handleGenerate = async (type: SummaryType) => {
    if (!activeSourceId) return;
    setGenerating(type);
    setError(null);
    try {
      const item = await generateSummary(activeSourceId, type);
      setSummaries((prev) => {
        const filtered = prev.filter((s) => s.type !== type);
        return [...filtered, item];
      });
      setActiveType(type);
    } catch (err: any) {
      setError(err.message ?? 'Failed to generate summary');
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async (type: string) => {
    if (!activeSourceId) return;
    try {
      await deleteSummary(activeSourceId, type);
      setSummaries((prev) => prev.filter((s) => s.type !== type));
    } catch {
      // ignore
    }
  };

  const handleCopy = async () => {
    if (!activeSummary?.content) return;
    try {
      await navigator.clipboard.writeText(activeSummary.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    if (!activeSummary?.content) return;
    const blob = new Blob([activeSummary.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSourceTitle || 'summary'}_${activeType}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeSourceId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-700 mb-1">AI Summaries</h2>
          <p className="text-sm text-gray-400">Click a source in the sidebar to view or generate summaries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Type selector tabs */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-200 bg-white overflow-x-auto scrollbar-thin">
        {SUMMARY_TYPES.map((type) => {
          const hasSummary = summaries.some((s) => s.type === type);
          const isActive = activeType === type;
          const isLoading = generating === type;
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {SUMMARY_TYPE_LABELS[type]}
              {hasSummary && !isLoading && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
              {isLoading && <Loader2 size={10} className="animate-spin ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="text-sm text-rose-500 text-center py-4">{error}</div>
        )}

        {!loading && !error && activeSummary && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
              {activeSummary.content}
            </div>
          </div>
        )}

        {!loading && !error && !activeSummary && generating !== activeType && (
          <div className="flex flex-col items-center justify-center py-12">
            <Sparkles size={28} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-4">
              No {SUMMARY_TYPE_LABELS[activeType].toLowerCase()} summary yet
            </p>
            <button
              onClick={() => handleGenerate(activeType)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all"
            >
              <Sparkles size={12} />
              Generate {SUMMARY_TYPE_LABELS[activeType]}
            </button>
          </div>
        )}

        {!loading && !error && generating === activeType && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-indigo-500 mb-3" />
            <p className="text-sm text-gray-500">Generating {SUMMARY_TYPE_LABELS[activeType].toLowerCase()} summary...</p>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!activeSummary && generating !== activeType && (
            <button
              onClick={() => handleGenerate(activeType)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            >
              <Sparkles size={12} />
              Generate
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeSummary && (
            <>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                title="Copy to clipboard"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                title="Download as markdown"
              >
                <FileDown size={12} />
                Download
              </button>
              <button
                onClick={() => handleDelete(activeType)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                title="Delete summary"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
