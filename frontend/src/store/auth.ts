import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiCache } from '@/services/cache';
import { setAuthCookie, clearAuthCookie } from '@/lib/authCookies';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  permissions: string[];
  team_id?: number;
  employee_id?: string;
  designation?: string;
  profile_photo_path?: string;
  phone?: string;
  emergency_contact?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        apiCache.clearAll();
        if (typeof window !== 'undefined') {
          setAuthCookie(token);
        }
        set({ user, token, isAuthenticated: true });
      },
      updateUser: (partial) => set((state) => ({ user: state.user ? { ...state.user, ...partial } : null })),
      logout: () => {
        apiCache.clearAll();
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('auth-storage');
            clearAuthCookie();
          } catch {}
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage', // stored in local storage
    }
  )
);
