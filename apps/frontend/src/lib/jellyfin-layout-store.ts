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
      fullWidth: false,
      toggleFullWidth: () => set((s) => ({ fullWidth: !s.fullWidth })),
      setFullWidth: (v) => set({ fullWidth: v }),
      sidebarStyle: 'spotify',
      setSidebarStyle: (v) => set({ sidebarStyle: v }),
    }),
    { name: 'jellyfin-layout' },
  ),
);
