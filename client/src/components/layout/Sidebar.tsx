import { useEffect, useState } from 'react';
import { Plus, Wifi, WifiOff, LayoutDashboard } from 'lucide-react';
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
    <aside className="w-72 flex-shrink-0 h-full flex flex-col bg-slate-900 border-r border-slate-800 shadow-2xl z-10">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            <h1 className="text-sm font-black text-white tracking-widest uppercase">YT AI CHAT</h1>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
              connected === false ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {connected === false ? <WifiOff size={10} /> : <Wifi size={10} />}
            <span>{connected === false ? 'Offline' : 'Online'}</span>
          </div>
        </div>

        <button
          onClick={openAddVideoModal}
          disabled={videoIds.length >= 10}
          className="group relative w-full overflow-hidden flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          aria-label="Add new video"
        >
          <div className="absolute inset-0 bg-white/10 group-hover:bg-transparent transition-colors"></div>
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Add New Video</span>
        </button>
      </div>

      {/* Video list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        <div className="px-3 mb-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Your Videos</p>
        </div>
        {videoIds.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/20 rounded-2xl border border-dashed border-slate-700/50">
            <p className="text-sm font-medium text-slate-400">No videos loaded</p>
            <p className="text-xs text-slate-500 mt-2">Start by adding your first YouTube URL</p>
          </div>
        ) : (
          videoIds.map((id) => <VideoCard key={id} videoId={id} />)
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span>Usage</span>
          <span>{videoIds.length}/10</span>
        </div>
        <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" 
            style={{ width: `${(videoIds.length / 10) * 100}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
