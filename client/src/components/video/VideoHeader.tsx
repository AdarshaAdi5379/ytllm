import { useState } from 'react';
import { ExternalLink, Download } from 'lucide-react';
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
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <img
          src={video.thumbnailUrl}
          alt=""
          className="w-16 h-10 object-cover rounded flex-shrink-0 bg-gray-200"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
          }}
        />

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate text-sm leading-tight">{video.title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {video.channelName} &middot; {video.duration}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={getYouTubeUrl(videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Open on YouTube"
          >
            <ExternalLink size={16} />
          </a>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors"
            aria-label="Export conversation"
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {showExportModal && (
        <ExportModal videoId={videoId} onClose={() => setShowExportModal(false)} />
      )}
    </>
  );
}
