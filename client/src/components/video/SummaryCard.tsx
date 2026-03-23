import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
    <div className="bg-white border-b border-gray-200">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        aria-expanded={expanded}
      >
        <span>Video Summary</span>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-600 leading-relaxed mb-3">{video.summary}</p>

          {video.suggestedQuestions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Suggested questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {video.suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onQuestionClick(q)}
                    className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-500 hover:bg-brand-100 border border-brand-100 transition-colors"
                  >
                    {q}
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
