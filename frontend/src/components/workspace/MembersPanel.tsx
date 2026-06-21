import { useEffect, useState, useCallback } from 'react';
import { X, Mail, Shield, UserMinus, Loader2, Crown, UserCog, User, Eye, Check } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { listMembers, inviteMember, updateMemberRole, removeMember, type MemberItem } from '../../api/workspace';

interface MembersPanelProps {
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown size={12} className="text-amber-400" />,
  admin: <UserCog size={12} className="text-indigo-400" />,
  editor: <User size={12} className="text-emerald-400" />,
  viewer: <Eye size={12} className="text-slate-400" />,
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-amber-400 bg-amber-500/10',
  admin: 'text-indigo-400 bg-indigo-500/10',
  editor: 'text-emerald-400 bg-emerald-500/10',
  viewer: 'text-slate-400 bg-slate-500/10',
};

export function MembersPanel({ onClose }: MembersPanelProps) {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceName = useWorkspaceStore((s) => {
    const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);
    return ws?.name ?? '';
  });
  const currentUser = useAuthStore((s) => s.user);

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [removing, setRemoving] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const currentRole = members.find((m) => m.user_id === currentUser?.id)?.role ?? 'viewer';
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listMembers(workspaceId);
      setMembers(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async () => {
    if (!workspaceId || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      await inviteMember(workspaceId, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      await load();
    } catch (err: any) {
      setInviteError(err.message ?? 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!workspaceId) return;
    setRemoving(memberId);
    try {
      await removeMember(workspaceId, memberId);
      await load();
    } catch {
      // ignore
    } finally {
      setRemoving(null);
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    if (!workspaceId) return;
    setUpdating(memberId);
    try {
      await updateMemberRole(workspaceId, memberId, role);
      await load();
    } catch {
      // ignore
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-sm font-bold text-white">Manage Members</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">{workspaceName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Invite form */}
          {isAdmin && (
            <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">Invite member</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInvite();
                    if (e.key === 'Escape') onClose();
                  }}
                  placeholder="user@example.com"
                  className="flex-1 bg-slate-800 text-xs text-white px-2 py-1.5 rounded-lg outline-none border border-slate-600 focus:border-indigo-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="bg-slate-800 text-xs text-white px-1.5 py-1.5 rounded-lg outline-none border border-slate-600 focus:border-indigo-500"
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center gap-1"
                >
                  {inviting ? <Loader2 size={10} className="animate-spin" /> : null}
                  Invite
                </button>
              </div>
              {inviteError && (
                <p className="text-[10px] text-rose-400">{inviteError}</p>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={16} className="animate-spin text-slate-500" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <p className="text-xs text-rose-400 text-center py-4">{error}</p>
          )}

          {/* Members list */}
          {!loading && !error && members.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No members</p>
          )}

          {!loading && members.length > 0 && (
            <div className="space-y-1">
              {members.map((member) => {
                const isOwner = member.role === 'owner';
                const nonOwnerId = isOwner ? null : member.id;
                const isCurrentUser = member.user_id === currentUser?.id;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-all"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${ROLE_COLORS[member.role] || 'text-slate-400 bg-slate-500/10'}`}>
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-white truncate">{member.email}</span>
                        {isCurrentUser && (
                          <span className="text-[9px] text-slate-500">(you)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${ROLE_COLORS[member.role] || ''}`}>
                          {ROLE_ICONS[member.role]}
                          {ROLE_LABELS[member.role] || member.role}
                        </span>
                      </div>
                    </div>

                    {/* Role changer (non-owner, admin only) */}
                    {isAdmin && nonOwnerId && (
                      <div className="flex items-center gap-1">
                        {updating === nonOwnerId ? (
                          <Loader2 size={10} className="animate-spin text-slate-500" />
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(nonOwnerId, e.target.value)}
                            className="bg-slate-800 text-[10px] text-slate-300 px-1 py-0.5 rounded outline-none border border-slate-600"
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        )}
                        <button
                          onClick={() => handleRemove(nonOwnerId)}
                          disabled={removing === nonOwnerId}
                          className="p-1 text-slate-600 hover:text-rose-400 transition-all disabled:opacity-50"
                          title="Remove member"
                        >
                          {removing === nonOwnerId
                            ? <Loader2 size={10} className="animate-spin" />
                            : <UserMinus size={10} />
                          }
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
