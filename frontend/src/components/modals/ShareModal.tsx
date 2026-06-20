import { useState } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { useVideoStore } from '../../store/useVideoStore';
import { getYouTubeUrl } from '../../utils/youtubeParser';
import toast from 'react-hot-toast';

interface Props {
  videoId: string;
  onClose: () => void;
}

export function ShareModal({ videoId, onClose }: Props) {
  const video = useVideoStore((s) => s.videos[videoId]);
  const [copiedYt, setCopiedYt] = useState(false);
  const [copiedApp, setCopiedApp] = useState(false);

  if (!video) return null;

  const ytUrl = getYouTubeUrl(videoId);
  const appUrl = `${window.location.origin}?video=${videoId}`;

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Share</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Video info */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <img
              src={video.thumbnailUrl}
              alt=""
              className="w-12 h-9 rounded-lg object-cover flex-shrink-0 border border-gray-200"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{video.customName || video.title}</p>
              <p className="text-xs text-gray-500 truncate">{video.channelName}</p>
            </div>
          </div>

          {/* YouTube link */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              YouTube Link
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 truncate">
                {ytUrl}
              </div>
              <button
                onClick={() => copyToClipboard(ytUrl, setCopiedYt)}
                className="flex-shrink-0 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all"
                aria-label="Copy YouTube link"
              >
                {copiedYt ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
              <a
                href={ytUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all"
                aria-label="Open in YouTube"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          {/* App link */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              App Link
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 truncate">
                {appUrl}
              </div>
              <button
                onClick={() => copyToClipboard(appUrl, setCopiedApp)}
                className="flex-shrink-0 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all"
                aria-label="Copy app link"
              >
                {copiedApp ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Opens this video directly in YT AI Chat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
