import { useState } from 'react';
import { ExternalLink, Download, Youtube } from 'lucide-react';
import { useVideoStore } from '../../store/useVideoStore';
import { getYouTubeUrl } from '../../utils/youtubeParser';
import { ExportModal } from '../modals/ExportModal';

interface Props {
  videoId: string;
}

export function VideoHeader({ videoId }: Props) {
  const video = useVideoStore((s) => s.videos[videoId]);
  const [showExportModal, setShowExportModal] = useState(false);

  if (!video) return null;

  return (
    <>
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between gap-6">
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className="flex-shrink-0 flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
            Live Chatting
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="font-bold text-slate-800 truncate text-base leading-tight tracking-tight">
              {video.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                <Youtube size={10} className="text-rose-500" />
                {video.channelName}
              </div>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{video.duration}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <a
            href={getYouTubeUrl(videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-xs font-bold uppercase tracking-widest"
          >
            <ExternalLink size={14} />
            Watch
          </a>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </header>

      {showExportModal && (
        <ExportModal videoId={videoId} onClose={() => setShowExportModal(false)} />
      )}
    </>
  );
}
