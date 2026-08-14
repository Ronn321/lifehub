'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SidebarStyle = 'classic' | 'spotify';

interface LayoutState {
  fullWidth: boolean;
  toggleFullWidth: () => void;
  setFullWidth: (v: boolean) => void;
  /** Music sidebar collapse style: 'classic' (toggle button on the edge) or 'spotify' (toggle inside) */
  sidebarStyle: SidebarStyle;
  setSidebarStyle: (v: SidebarStyle) => void;
}

export const useJellyfinLayout = create<LayoutState>()(
  persist(
    (set) => ({
      fullWidth: true,
      toggleFullWidth: () => set((s) => ({ fullWidth: !s.fullWidth })),
      setFullWidth: (v) => set({ fullWidth: v }),
      sidebarStyle: 'spotify',
      setSidebarStyle: (v) => set({ sidebarStyle: v }),
    }),
    {
      name: 'jellyfin-layout',
      version: 1,
      // One-time migration for stores created before v1: default to full-width layout
      migrate: (state: any) => ({ ...state, fullWidth: true }),
    },
  ),
);
