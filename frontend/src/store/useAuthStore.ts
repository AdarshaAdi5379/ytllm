import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuthToken } from '../api/client';
import { getGuestToken, claimGuestSessions } from '../api/standalone';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  authModalMode: 'login' | 'register' | null;

  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setAuthModalMode: (mode: 'login' | 'register' | null) => void;
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
      clearAuth: () => {
        setAuthToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },
      setAuthModalMode: (mode) => set({ authModalMode: mode }),
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
