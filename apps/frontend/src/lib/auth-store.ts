'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse } from './api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthResponse['user'] | null;
  roles: string[];
  setAuth: (data: AuthResponse) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      roles: [],
      setAuth: (data) =>
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          roles: data.roles,
        }),
      clear: () =>
        set({ accessToken: null, refreshToken: null, user: null, roles: [] }),
    }),
    { name: 'lifehub-auth' },
  ),
);
