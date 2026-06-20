import { useState, useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { useVideoStore } from '../../store/useVideoStore';
import { getYouTubeUrl } from '../../utils/youtubeParser';

interface Props {
  videoId: string;
}

let _seekCallback: ((time: number) => void) | null = null;
export function seekPlayer(time: number) {
  _seekCallback?.(time);
}

export function VideoPlayer({ videoId }: Props) {
  const isOpen = useVideoStore((s) => s.videos[videoId]?.isPlayerOpen ?? false);
  const [seekVersion, setSeekVersion] = useState(0);
  const seekTimeRef = useRef<number | null>(null);

  useEffect(() => {
    _seekCallback = (time: number) => {
      seekTimeRef.current = time;
      setSeekVersion((v) => v + 1);
    };
    return () => {
      _seekCallback = null;
    };
  }, []);

  if (!isOpen) return null;

  const startParam = seekTimeRef.current != null ? `&start=${Math.floor(seekTimeRef.current)}` : '';
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1${startParam}`;

  return (
    <div className="relative border-b border-slate-200 bg-black">
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          key={`${videoId}-${seekVersion}`}
          src={src}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video player"
        />
      </div>
      <div className="absolute top-2 right-2 z-10">
        <a
          href={getYouTubeUrl(videoId)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white/80 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all backdrop-blur-sm"
          title="Open in YouTube"
        >
          <ExternalLink size={12} />
          YouTube
        </a>
      </div>
    </div>
  );
}
