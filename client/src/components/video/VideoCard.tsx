import { X, Play } from 'lucide-react';
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
      className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
        isActive
          ? 'bg-indigo-500/10 border border-indigo-500/20'
          : 'hover:bg-slate-800/50 border border-transparent'
      }`}
      role="button"
      tabIndex={0}
      aria-label={`Switch to ${video.title}`}
      onKeyDown={(e) => e.key === 'Enter' && setActiveVideo(videoId)}
    >
      {/* Active Indicator Bar */}
      {isActive && (
        <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r-full"></div>
      )}

      {/* Thumbnail Wrapper */}
      <div className="relative w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-slate-700/50">
        <img
          src={video.thumbnailUrl}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
          }}
        />
        <div className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <Play size={12} className="text-white fill-white" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold truncate leading-tight transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
          {video.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <StatusBadge status={video.status} />
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeVideo(videoId);
        }}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all flex-shrink-0"
        aria-label={`Remove ${video.title}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
