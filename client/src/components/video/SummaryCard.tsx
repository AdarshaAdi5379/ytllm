import { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { useVideoStore } from '../../store/useVideoStore';

interface Props {
  videoId: string;
  onQuestionClick: (question: string) => void;
}

export function SummaryCard({ videoId, onQuestionClick }: Props) {
  const video = useVideoStore((s) => s.videos[videoId]);
  const [expanded, setExpanded] = useState(true);

  if (!video) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-200">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <BookOpen size={14} />
          </div>
          <span className="uppercase tracking-widest text-[11px] font-black">Video Summary</span>
        </div>
        {expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-[13px] text-slate-500 leading-relaxed mb-5 font-medium">{video.summary}</p>

          {video.suggestedQuestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested questions</p>
              <div className="flex flex-col gap-2">
                {video.suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onQuestionClick(q)}
                    className="group text-left text-[12px] p-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-indigo-600 hover:text-white border border-slate-100 hover:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-indigo-500/20"
                  >
                    <span className="line-clamp-2 font-semibold">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
