import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuthToken, setOnUnauthorized } from '../api/client';
import { getGuestToken, claimGuestSessions } from '../api/standalone';
import { supabase } from '../lib/supabase';

interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authModalMode: 'login' | 'register' | 'forgotPassword' | 'setPassword' | null;

  setAuth: (user: AuthUser, token: string) => void;
  setSupabaseAuth: (accessToken: string) => Promise<void>;
  clearAuth: () => void;
  setAuthModalMode: (mode: 'login' | 'register' | 'forgotPassword' | 'setPassword' | null) => void;
  initAuthListener: () => () => void;
  clearPasswordRecovery: () => void;
  resolveAuthOnMount: () => Promise<void>;
  updateProfile: (data: { display_name?: string | null; avatar_url?: string | null }) => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAuthLoading: true,

      authModalMode: null,

      resolveAuthOnMount: async () => {
        // Register global 401 handler
        setOnUnauthorized(() => {
          setAuthToken(null);
          set({ user: null, token: null, isAuthenticated: false });
          if (supabase) {
            supabase.auth.signOut().catch(() => {});
          }
        });

        // Try Supabase session first
        if (supabase) {
          const { getSupabaseSession } = await import('../lib/auth');
          const session = await getSupabaseSession();
          if (session?.access_token) {
            setAuthToken(session.access_token);
            try {
              const { getMe } = await import('../api/client');
              const userData = await getMe();
              set({ user: userData, token: session.access_token, isAuthenticated: true, isAuthLoading: false });
              return;
            } catch {
              // session invalid — clear and fall through
              setAuthToken(null);
            }
          }
        }

        // Fall back to stored token
        const storedToken = useAuthStore.getState().token;
        if (storedToken) {
          setAuthToken(storedToken);
          try {
            const { getMe } = await import('../api/client');
            const userData = await getMe();
            set({ user: userData, token: storedToken, isAuthenticated: true, isAuthLoading: false });
            return;
          } catch {
            setAuthToken(null);
            set({ user: null, token: null, isAuthenticated: false });
          }
        }

        set({ isAuthLoading: false });
      },

      setAuth: async (user, token) => {
        setAuthToken(token);
        set({ user, token, isAuthenticated: true });
        try {
          const guestToken = getGuestToken();
          const result = await claimGuestSessions(guestToken);
          if (result.claimed > 0) {
            localStorage.removeItem('standalone-guest-token');
          }
        } catch {
          // guest claim is best-effort
        }
      },

      setSupabaseAuth: async (accessToken: string) => {
        setAuthToken(accessToken);
        try {
          const { getMe } = await import('../api/client');
          const userData = await getMe();
          set({ user: userData, token: accessToken, isAuthenticated: true });
          try {
            const guestToken = getGuestToken();
            const result = await claimGuestSessions(guestToken);
            if (result.claimed > 0) {
              localStorage.removeItem('standalone-guest-token');
            }
          } catch {
            // best-effort
          }
        } catch {
          setAuthToken(null);
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      clearAuth: () => {
        setAuthToken(null);
        set({ user: null, token: null, isAuthenticated: false });
        if (supabase) {
          supabase.auth.signOut().catch(() => {});
        }
      },

      setAuthModalMode: (mode) => set({ authModalMode: mode }),

      clearPasswordRecovery: () => set({ authModalMode: null }),

      updateProfile: async (data) => {
        try {
          const { updateProfile: apiUpdate } = await import('../api/client');
          const updated = await apiUpdate(data);
          set({ user: { ...useAuthStore.getState().user!, ...updated } });
        } catch (err) {
          console.error('Failed to update profile:', err);
          throw err;
        }
      },

      initAuthListener: () => {
        if (!supabase) return () => {};
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
              set({ authModalMode: 'setPassword' });
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              if (session?.access_token) {
                useAuthStore.getState().setSupabaseAuth(session.access_token);
              }
            } else if (event === 'SIGNED_OUT') {
              setAuthToken(null);
              set({ user: null, token: null, isAuthenticated: false });
            }
          },
        );
        return () => subscription?.unsubscribe();
      },
    }),
    {
      name: 'knowledgeos-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setAuthToken(state.token);
        }
      },
    }
  )
);
