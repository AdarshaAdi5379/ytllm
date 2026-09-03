import { useEffect, useState } from 'react';
import { Plus, Wifi, WifiOff, LayoutDashboard, LogIn, LogOut, User, Bookmark, Loader2, UserPlus, Sparkles, Layers, Menu, X } from 'lucide-react';
import { VideoCard } from '../video/VideoCard';
import { useVideoStore } from '../../store/useVideoStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { checkHealth } from '../../api/client';
import { SavedVideosList } from '../video/SavedVideosList';
import { useRestoreVideo } from '../../hooks/useRestoreVideo';
import { WorkspaceSidebarContent } from '../workspace/WorkspaceSidebar';
import { StandaloneSidebarSection } from '../standalone/StandaloneSidebarSection';
import { ProfilePanel } from '../auth/ProfilePanel';

export function Sidebar() {
  const { videos, openAddVideoModal, clearVideos } = useVideoStore();
  const { user, isAuthenticated, isAuthLoading, clearAuth, setAuthModalMode, updateProfile } = useAuthStore();
  const { appMode, setAppMode, sidebarOpen, setSidebarOpen } = useAppStore();
  const videoIds = Object.keys(videos);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [showSavedVideos, setShowSavedVideos] = useState(false);
  const { restore, restoring } = useRestoreVideo();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async (retries = 3, delay = 2000) => {
      for (let i = 0; i < retries; i++) {
        if (cancelled) return;
        try {
          await checkHealth();
          if (!cancelled) setConnected(true);
          return;
        } catch {
          if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
        }
      }
      if (!cancelled) setConnected(false);
    };
    check();
    const interval = setInterval(() => check(1), 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            <h1 className="text-sm font-bold text-white tracking-tight">Scritur</h1>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${
                connected === false ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {connected === false ? <WifiOff size={10} /> : <Wifi size={10} />}
              <span>{connected === false ? 'Offline' : 'Online'}</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* App mode toggle */}
        <div className="flex items-center gap-1 mb-3 bg-slate-800/50 rounded-lg p-0.5">
          <button
            onClick={() => setAppMode('standalone')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
              appMode === 'standalone'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={12} />
            Standalone
          </button>
          <button
            onClick={() => setAppMode('workspace')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
              appMode === 'workspace'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={12} />
            Workspace
          </button>
        </div>

        {/* Add button for legacy video mode (standalone) */}
        {appMode === 'standalone' && (
          <button
            onClick={openAddVideoModal}
            disabled={videoIds.length >= 10}
            className="group relative w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Add new video"
          >
            <Plus size={16} />
            <span>Add new video</span>
          </button>
        )}
      </div>

      {/* Content area: switch based on mode */}
      {appMode === 'standalone' ? (
        <StandaloneSidebarSection />
      ) : isAuthenticated ? (
        <WorkspaceSidebarContent />
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-medium text-slate-500">Your videos</p>
          </div>
          {videoIds.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/20 rounded-2xl border border-dashed border-slate-700/50">
              <p className="text-sm font-medium text-slate-400">No videos loaded</p>
              <p className="text-xs text-slate-500 mt-2">Start by adding your first YouTube URL</p>
            </div>
          ) : (
            [...videoIds]
              .sort((a, b) => {
                const va = videos[a];
                const vb = videos[b];
                if (va?.isPinned && !vb?.isPinned) return -1;
                if (!va?.isPinned && vb?.isPinned) return 1;
                return 0;
              })
              .map((id) => <VideoCard key={id} videoId={id} />)
          )}
        </div>
      )}

      {/* Guest auth section */}
      {!isAuthenticated && !isAuthLoading && (
        <div className="px-3 py-2 border-t border-slate-800/50">
          <div className="space-y-1">
            <button
              onClick={() => setAuthModalMode('login')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
            >
              <LogIn size={14} />
              Sign in
            </button>
            <button
              onClick={() => setAuthModalMode('register')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600/80 hover:bg-indigo-600 transition-all"
            >
              <UserPlus size={14} />
              Sign up
            </button>
          </div>
        </div>
      )}

      {/* Auth section (logged-in only) */}
      {isAuthenticated && user && (
        <div className="px-3 py-2 border-t border-slate-800/50">
          <div className="space-y-2">
            <button
              onClick={() => setShowSavedVideos((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
            >
              <Bookmark size={14} />
              My videos
            </button>
            {showSavedVideos && <SavedVideosList onRestore={restore} />}
            {restoring && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" />
                Restoring video...
              </div>
            )}
            <button
              onClick={() => setShowProfile(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all text-left"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <User size={12} className="text-indigo-600" />
                </div>
              )}
              <span className="truncate">{user.display_name || user.email}</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
          <span>Usage</span>
          <span>{videoIds.length}/10</span>
        </div>
        <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-500" 
            style={{ width: `${(videoIds.length / 10) * 100}%` }}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger button - visible on mobile only */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-slate-900 text-white shadow-lg hover:bg-slate-800 transition-all"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Desktop sidebar - always visible */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 h-full flex-col bg-slate-900 border-r border-slate-800 shadow-2xl z-10">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 flex flex-col bg-slate-900 border-r border-slate-800 shadow-2xl z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
    </>
  );
}
