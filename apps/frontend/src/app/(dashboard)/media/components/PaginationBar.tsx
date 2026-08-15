'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  /** Current page number (1-based). */
  page: number;
  /** Total number of media items. */
  total: number;
  /** Number of items shown per page. */
  pageSize: number;
  /** Called when the user navigates to another page. */
  onPageChange: (page: number) => void;
  /** Called when the user changes the page size. */
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZES = [50, 100, 200];

export default function PaginationBar({
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  // Total number of pages, clamped to at least 1 so the UI stays valid for empty results.
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPageSizeChange(Number(e.target.value));
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Previous page */}
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 rounded-md border border-border bg-bg-surface px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-bg-raised disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        Zurück
      </button>

      {/* Current position / total count */}
      <span className="text-xs text-fg-muted">
        Seite {page} von {totalPages} · {total} Medien
      </span>

      {/* Next page */}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 rounded-md border border-border bg-bg-surface px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-bg-raised disabled:cursor-not-allowed disabled:opacity-40"
      >
        Weiter
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Page size selector */}
      <select
        value={pageSize}
        onChange={handlePageSizeChange}
        className="ml-auto rounded-md border border-border bg-bg-surface px-2 py-1.5 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/50"
      >
        {PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size} pro Seite
          </option>
        ))}
      </select>
    </div>
  );
}
