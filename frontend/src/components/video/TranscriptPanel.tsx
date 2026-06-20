import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, FileText } from 'lucide-react';
import { useVideoStore } from '../../store/useVideoStore';

interface Props {
  videoId: string;
}

export function TranscriptPanel({ videoId }: Props) {
  const video = useVideoStore((s) => s.videos[videoId]);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!video?.transcript) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(video.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-200">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <FileText size={14} />
          </div>
          <span className="uppercase tracking-widest text-[11px] font-black">Full Transcript</span>
        </div>
        {expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex justify-end mb-3">
            <button
              onClick={handleCopy}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all duration-200 shadow-sm"
              aria-label="Copy transcript"
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto scrollbar-thin bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-[12px] text-slate-500 leading-relaxed whitespace-pre-wrap font-medium">{video.transcript}</p>
          </div>
        </div>
      )}
    </div>
  );
}
