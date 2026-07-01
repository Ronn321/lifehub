'use client';

import { create } from 'zustand';

interface GridStore {
  dragActiveId: string | null;
  dragOverId: string | null;
  dragOffset: { x: number; y: number };
  resizeActiveId: string | null;
  resizeCurrent: { w: number; h: number };
  columns: number;

  setDragActive: (id: string | null, offset?: { x: number; y: number }) => void;
  setDragOver: (id: string | null) => void;
  setResizeActive: (id: string | null, size?: { w: number; h: number }) => void;
  setColumns: (n: number) => void;
  clearAll: () => void;
}

export const useGridStore = create<GridStore>((set) => ({
  dragActiveId: null,
  dragOverId: null,
  dragOffset: { x: 0, y: 0 },
  resizeActiveId: null,
  resizeCurrent: { w: 1, h: 1 },
  columns: 6,

  setDragActive: (id, offset) =>
    set({ dragActiveId: id, dragOffset: offset ?? { x: 0, y: 0 } }),
  setDragOver: (id) => set({ dragOverId: id }),
  setResizeActive: (id, size) =>
    set({ resizeActiveId: id, resizeCurrent: size ?? { w: 1, h: 1 } }),
  setColumns: (n) => set({ columns: n }),
  clearAll: () =>
    set({
      dragActiveId: null,
      dragOverId: null,
      dragOffset: { x: 0, y: 0 },
      resizeActiveId: null,
      resizeCurrent: { w: 1, h: 1 },
    }),
}));
