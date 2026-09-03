import { useState } from 'react';
import { ArrowLeft, ExternalLink, Download, Youtube, Monitor, MonitorOff } from 'lucide-react';
import { useVideoStore } from '../../store/useVideoStore';
import { getYouTubeUrl } from '../../utils/youtubeParser';
import { ExportModal } from '../modals/ExportModal';

interface Props {
  videoId: string;
}

export function VideoHeader({ videoId }: Props) {
  const video = useVideoStore((s) => s.videos[videoId]);
  const setPlayerOpen = useVideoStore((s) => s.setPlayerOpen);
  const setActiveVideo = useVideoStore((s) => s.setActiveVideo);
  const isPlayerOpen = useVideoStore((s) => s.videos[videoId]?.isPlayerOpen ?? false);
  const [showExportModal, setShowExportModal] = useState(false);

  if (!video) return null;

  return (
    <>
      <header className="bg-white border-b border-slate-100 pl-12 pr-6 py-4 lg:pl-6 flex items-center justify-between gap-6">
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <button
            onClick={() => setActiveVideo(null)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex-shrink-0"
            title="Back to home"
          >
            <ArrowLeft size={14} />
            Home
          </button>
          <div className="flex flex-col min-w-0">
            <h2 className="font-bold text-slate-800 truncate text-base leading-tight">
              {video.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Youtube size={10} className="text-slate-400" />
                {video.channelName}
              </div>
              <span className="text-[11px] text-slate-400">·</span>
              <span className="text-[11px] text-slate-400">{video.duration}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setPlayerOpen(videoId, !isPlayerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isPlayerOpen
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200'
            }`}
            title={isPlayerOpen ? 'Hide video player' : 'Show video player'}
          >
            {isPlayerOpen ? <MonitorOff size={13} /> : <Monitor size={13} />}
            {isPlayerOpen ? 'Hide' : 'Watch'}
          </button>
          <a
            href={getYouTubeUrl(videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            title="Open in YouTube"
          >
            <ExternalLink size={14} />
          </a>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            <Download size={13} />
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
