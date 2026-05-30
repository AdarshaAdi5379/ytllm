import { useEffect, useState } from 'react';
import { Trash2, Clock, MessageSquare } from 'lucide-react';
import { fetchSavedVideos, deleteSavedVideo, type SavedVideoItem } from '../../api/client';
import { useVideoStore } from '../../store/useVideoStore';

interface Props {
  onRestore?: (id: string) => void;
}

export function SavedVideosList({ onRestore }: Props) {
  const [videos, setVideos] = useState<SavedVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const removeVideo = useVideoStore((s) => s.removeVideo);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSavedVideos();
      setVideos(data);
    } catch (err) {
      setError((err as Error).message || 'Failed to load saved videos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSavedVideo(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      setError((err as Error).message || 'Failed to delete video.');
    }
  };

  if (loading) {
    return (
      <div className="px-3 py-2 space-y-2">
        <div className="h-10 bg-slate-800/30 rounded-lg animate-pulse" />
        <div className="h-10 bg-slate-800/30 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <p className="px-3 py-2 text-xs text-rose-400">{error}</p>;
  }

  if (videos.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-slate-500 italic">
        No saved videos yet. Load a video while signed in to save it.
      </p>
    );
  }

  return (
    <div className="px-1 pb-1 space-y-1 max-h-48 overflow-y-auto">
      {videos.map((v) => (
        <div
          key={v.id}
          onClick={() => onRestore?.(v.id)}
          className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onRestore?.(v.id)}
        >
          <img
            src={v.thumbnail_url}
            alt=""
            className="w-10 h-7 rounded object-cover flex-shrink-0 border border-slate-700/50"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${v.youtube_video_id}/default.jpg`;
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-300 truncate leading-tight">{v.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-0.5 text-[9px] text-slate-500">
                <MessageSquare size={8} />
                {v.message_count}
              </span>
              <span className="flex items-center gap-0.5 text-[9px] text-slate-500">
                <Clock size={8} />
                {new Date(v.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => handleDelete(v.id, e)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all flex-shrink-0"
            aria-label="Delete saved video"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
