import { useEffect, useState } from 'react';
import { Plus, Wifi, WifiOff } from 'lucide-react';
import { VideoCard } from '../video/VideoCard';
import { useVideoStore } from '../../store/useVideoStore';
import { checkHealth } from '../../api/client';

export function Sidebar() {
  const { videos, openAddVideoModal } = useVideoStore();
  const videoIds = Object.keys(videos);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        await checkHealth();
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-64 flex-shrink-0 h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-bold text-gray-900">YouTube AI Chat</h1>
          <div
            className={`flex items-center gap-1 text-xs ${connected === false ? 'text-red-500' : 'text-green-600'}`}
            title={connected === false ? 'Server disconnected' : 'Server connected'}
          >
            {connected === false ? <WifiOff size={12} /> : <Wifi size={12} />}
          </div>
        </div>

        <button
          onClick={openAddVideoModal}
          disabled={videoIds.length >= 10}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Add new video"
        >
          <Plus size={16} />
          Add Video
        </button>
        {videoIds.length >= 10 && (
          <p className="text-xs text-gray-400 text-center mt-1">Max 10 videos reached</p>
        )}
      </div>

      {/* Video list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
        {videoIds.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400">
            <p>No videos loaded.</p>
            <p className="mt-1">Click "Add Video" to start.</p>
          </div>
        ) : (
          videoIds.map((id) => <VideoCard key={id} videoId={id} />)
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 text-xs text-gray-400 text-center">
        {videoIds.length}/10 videos loaded
      </div>
    </aside>
  );
}
