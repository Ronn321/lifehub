'use client';

/* ------------------------------------------------------------------ */
/*  Search History Hook — localStorage persistence                     */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'lifehub:music:search-history';
const MAX_ENTRIES = 20;

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
}

export function useSearchHistory() {
  const getHistory = (): SearchHistoryEntry[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SearchHistoryEntry[];
    } catch {
      return [];
    }
  };

  const addEntry = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const history = getHistory();
    // Remove duplicate if exists (case-insensitive)
    const filtered = history.filter(
      (entry) => entry.query.toLowerCase() !== trimmed.toLowerCase(),
    );
    const newEntry: SearchHistoryEntry = { query: trimmed, timestamp: Date.now() };
    const updated = [newEntry, ...filtered].slice(0, MAX_ENTRIES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  };

  const removeEntry = (q: string) => {
    const history = getHistory();
    const updated = history.filter(
      (entry) => entry.query.toLowerCase() !== q.toLowerCase(),
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // silently ignore
    }
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // silently ignore
    }
  };

  return { getHistory, addEntry, removeEntry, clearHistory };
}
