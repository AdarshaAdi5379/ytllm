import { useState, useRef, useEffect } from 'react';
import { X, User, Check, LogOut, Mail, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  supabase_email: 'Email',
  supabase: 'Supabase',
  legacy: 'Email',
};

const PROVIDER_COLORS: Record<string, string> = {
  google: 'bg-blue-500/10 text-blue-400',
  github: 'bg-gray-500/10 text-gray-300',
  supabase_email: 'bg-emerald-500/10 text-emerald-400',
  supabase: 'bg-emerald-500/10 text-emerald-400',
  legacy: 'bg-amber-500/10 text-amber-400',
};

interface Props {
  onClose: () => void;
}

export function ProfilePanel({ onClose }: Props) {
  const { user, clearAuth, updateProfile } = useAuthStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{
    auth_provider: string | null;
    created_at: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingName]);

  useEffect(() => {
    import('../../api/client').then(({ fetchProfile }) => {
      fetchProfile().then(setProfile).catch(() => {});
    });
  }, []);

  const provider = profile?.auth_provider || user?.auth_provider || 'legacy';
  const providerLabel = PROVIDER_LABELS[provider] || provider;
  const providerColor = PROVIDER_COLORS[provider] || 'bg-slate-500/10 text-slate-400';

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await updateProfile({ display_name: nameInput.trim() || null });
      setEditingName(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    clearAuth();
    onClose();
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Profile</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar */}
          <div className="flex justify-center">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center ring-2 ring-indigo-500/30">
                <User size={32} className="text-white" />
              </div>
            )}
          </div>

          {/* Display name */}
          <div className="text-center">
            {editingName ? (
              <div className="flex items-center justify-center gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  className="text-sm bg-slate-800 text-white rounded-lg px-3 py-1.5 outline-none ring-1 ring-indigo-500/50 w-48 text-center"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-emerald-400 disabled:opacity-50"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-base font-semibold text-white hover:text-indigo-400 transition-colors"
                title="Click to edit"
              >
                {user?.display_name || user?.email}
              </button>
            )}
          </div>

          {/* Auth provider badge */}
          <div className="flex justify-center">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${providerColor}`}>
              {provider === 'google' && (
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {provider === 'github' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.576 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              )}
              {providerLabel}
            </span>
          </div>

          {/* Info rows */}
          <div className="space-y-3 bg-slate-800/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-300 truncate">{user?.email}</span>
            </div>
            {profile?.created_at && (
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-slate-500 flex-shrink-0" />
                <span className="text-sm text-slate-300">
                  Joined {formatDate(profile.created_at)}
                </span>
              </div>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-rose-400 hover:text-white hover:bg-rose-500/10 border border-rose-500/20 transition-all uppercase tracking-widest"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
