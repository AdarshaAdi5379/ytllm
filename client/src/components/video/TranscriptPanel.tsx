import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
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
    <div className="bg-white border-b border-gray-200">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        aria-expanded={expanded}
      >
        <span>Full Transcript</span>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          <div className="flex justify-end mb-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Copy transcript"
            >
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-thin bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{video.transcript}</p>
          </div>
        </div>
      )}
    </div>
  );
}
