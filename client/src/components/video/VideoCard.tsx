import { X } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { useVideoStore } from '../../store/useVideoStore';

interface Props {
  videoId: string;
}

export function VideoCard({ videoId }: Props) {
  const { videos, activeVideoId, setActiveVideo, removeVideo } = useVideoStore();
  const video = videos[videoId];
  if (!video) return null;

  const isActive = activeVideoId === videoId;

  return (
    <div
      onClick={() => setActiveVideo(videoId)}
      className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-brand-50 border border-brand-500'
          : 'hover:bg-gray-100 border border-transparent'
      }`}
      role="button"
      tabIndex={0}
      aria-label={`Switch to ${video.title}`}
      onKeyDown={(e) => e.key === 'Enter' && setActiveVideo(videoId)}
    >
      {/* Thumbnail */}
      <img
        src={video.thumbnailUrl}
        alt=""
        className="w-14 h-10 object-cover rounded flex-shrink-0 bg-gray-200"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
        }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate leading-tight">{video.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={video.status} />
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeVideo(videoId);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
        aria-label={`Remove ${video.title}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
