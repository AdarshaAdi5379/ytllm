import { useState, useRef, useEffect } from 'react';
import { Play, Check, X } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { useVideoStore } from '../../store/useVideoStore';
import { useAuthStore } from '../../store/useAuthStore';
import { updateSavedVideo } from '../../api/client';
import { VideoCardMenu } from './VideoCardMenu';
import { ShareModal } from '../modals/ShareModal';

interface Props {
  videoId: string;
}

export function VideoCard({ videoId }: Props) {
  const { videos, activeVideoId, setActiveVideo, renameVideo } = useVideoStore();
  const token = useAuthStore((s) => s.token);
  const video = videos[videoId];

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [showShare, setShowShare] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (!video) return null;

  const isActive = activeVideoId === videoId;
  const displayTitle = video.customName || video.title;

  const startRename = () => {
    setEditValue(displayTitle);
    setEditing(true);
  };

  const saveRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== displayTitle) {
      renameVideo(videoId, trimmed);
      if (video.savedVideoId && token) {
        updateSavedVideo(video.savedVideoId, { custom_name: trimmed }).catch(() => {
          renameVideo(videoId, video.customName || video.title);
        });
      }
    }
    setEditing(false);
  };

  const cancelRename = () => {
    setEditing(false);
  };

  return (
    <>
      <div
        onClick={() => !editing && setActiveVideo(videoId)}
        className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
          isActive
            ? 'bg-indigo-500/10 border border-indigo-500/20'
            : 'hover:bg-slate-800/50 border border-transparent'
        }`}
        role="button"
        tabIndex={0}
        aria-label={`Switch to ${displayTitle}`}
        onKeyDown={(e) => e.key === 'Enter' && !editing && setActiveVideo(videoId)}
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
          {editing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename();
                  if (e.key === 'Escape') cancelRename();
                }}
                onBlur={saveRename}
                className="w-full text-xs font-bold bg-slate-700 text-white rounded px-1.5 py-0.5 border border-slate-500 outline-none focus:border-indigo-400"
                aria-label="Video name"
              />
              <button
                onClick={saveRename}
                className="p-0.5 rounded hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 flex-shrink-0"
              >
                <Check size={12} />
              </button>
              <button
                onClick={cancelRename}
                className="p-0.5 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 flex-shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <p className={`text-xs font-bold truncate leading-tight transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
              {displayTitle}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={video.status} />
          </div>
        </div>

        {/* 3-dot menu */}
        <VideoCardMenu
          videoId={videoId}
          onRename={startRename}
          onShare={() => setShowShare(true)}
        />
      </div>

      {showShare && <ShareModal videoId={videoId} onClose={() => setShowShare(false)} />}
    </>
  );
}
