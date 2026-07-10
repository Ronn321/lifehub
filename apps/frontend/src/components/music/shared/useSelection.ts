'use client';

import { useState, useCallback, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  useSelection — track list selection model                          */
/*  Supports single-select, toggle (Cmd/Ctrl+click), range (Shift+click), */
/*  select-all (Ctrl+A), and programmatic clear.                        */
/* ------------------------------------------------------------------ */

export interface UseSelectionReturn {
  selectedIds: Set<string>;
  selectOne: (id: string) => void;
  toggleOne: (id: string) => void;
  selectRange: (fromId: string, allIds: string[]) => void;
  selectAll: (allIds: string[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

export function useSelection(): UseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const anchorRef = useRef<string | null>(null);

  const selectOne = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
    anchorRef.current = id;
  }, []);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    anchorRef.current = id;
  }, []);

  const selectRange = useCallback((fromId: string, allIds: string[]) => {
    setSelectedIds((prev) => {
      const fromIndex = allIds.indexOf(fromId);
      if (fromIndex === -1) return prev;

      const anchorId = anchorRef.current;
      const anchorIndex = anchorId ? allIds.indexOf(anchorId) : -1;

      const start = anchorIndex === -1 ? fromIndex : Math.min(fromIndex, anchorIndex);
      const end = anchorIndex === -1 ? fromIndex : Math.max(fromIndex, anchorIndex);

      const next = new Set<string>();
      for (let i = start; i <= end; i++) {
        const id = allIds[i];
        if (id) next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((allIds: string[]) => {
    setSelectedIds(new Set(allIds));
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    anchorRef.current = null;
  }, []);

  const isSelected = useCallback(
    (id: string): boolean => selectedIds.has(id),
    [selectedIds],
  );

  return {
    selectedIds,
    selectOne,
    toggleOne,
    selectRange,
    selectAll,
    clear,
    isSelected,
    selectedCount: selectedIds.size,
  };
}
