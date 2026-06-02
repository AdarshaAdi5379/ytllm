import { useRef, useEffect, useState } from 'react';
import { MoreVertical, Pencil, Share2, Pin, PinOff, Archive, Trash2, type LucideIcon } from 'lucide-react';
import { useVideoStore } from '../../store/useVideoStore';
import { useAuthStore } from '../../store/useAuthStore';
import { deleteSavedVideo, updateSavedVideo } from '../../api/client';
import toast from 'react-hot-toast';

interface Props {
  videoId: string;
  onRename: () => void;
  onShare: () => void;
}

export function VideoCardMenu({ videoId, onRename, onShare }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const video = useVideoStore((s) => s.videos[videoId]);
  const removeVideo = useVideoStore((s) => s.removeVideo);
  const setPinned = useVideoStore((s) => s.setPinned);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const close = () => setOpen(false);

  const handleRename = () => {
    close();
    onRename();
  };

  const handleShare = () => {
    close();
    onShare();
  };

  const handleTogglePin = () => {
    const newPinned = !video?.isPinned;
    setPinned(videoId, newPinned);
    if (video?.savedVideoId && token) {
      updateSavedVideo(video.savedVideoId, { is_pinned: newPinned }).catch(() => {
        setPinned(videoId, !newPinned);
      });
    }
    close();
  };

  const handleArchive = () => {
    removeVideo(videoId);
    close();
  };

  const handleDelete = async () => {
    const savedId = video?.savedVideoId;
    removeVideo(videoId);
    if (savedId && token) {
      try {
        await deleteSavedVideo(savedId);
        toast.success('Video deleted');
      } catch {
        toast.error('Failed to delete video from server');
      }
    }
    close();
  };

  if (!video) return null;

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-all"
        aria-label="Video menu"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-44 py-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem icon={Pencil} label="Rename" onClick={handleRename} />
          <MenuItem icon={Share2} label="Share" onClick={handleShare} />
          <div className="mx-2 my-1 h-px bg-slate-700/50" />
          <MenuItem
            icon={video.isPinned ? PinOff : Pin}
            label={video.isPinned ? 'Unpin' : 'Pin'}
            onClick={handleTogglePin}
          />
          <MenuItem icon={Archive} label="Archive" onClick={handleArchive} />
          <div className="mx-2 my-1 h-px bg-slate-700/50" />
          <MenuItem icon={Trash2} label="Delete" onClick={handleDelete} danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all ${
        danger
          ? 'text-rose-400 hover:bg-rose-500/10'
          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
