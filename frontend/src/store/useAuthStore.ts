import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuthToken } from '../api/client';
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
  authModalMode: 'login' | 'register' | null;

  setAuth: (user: AuthUser, token: string) => void;
  setSupabaseAuth: (accessToken: string) => Promise<void>;
  clearAuth: () => void;
  setAuthModalMode: (mode: 'login' | 'register' | null) => void;
  initAuthListener: () => () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      authModalMode: null,

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

      initAuthListener: () => {
        if (!supabase) return () => {};
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
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
