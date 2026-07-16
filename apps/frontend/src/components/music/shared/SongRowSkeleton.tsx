'use client';

/* ------------------------------------------------------------------ */
/*  SongRowSkeleton — pulsing placeholder rows for loading states      */
/* ------------------------------------------------------------------ */

interface SongRowSkeletonProps {
  rows?: number;
}

export function SongRowSkeleton({ rows = 16 }: SongRowSkeletonProps) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 animate-pulse"
          style={{ height: '56px' }}
        >
          {/* Index */}
          <div className="h-4 w-4 shrink-0 rounded bg-[var(--music-bg-card)]" />

          {/* Cover */}
          <div className="h-10 w-10 shrink-0 rounded bg-[var(--music-bg-card)]" />

          {/* Title + Artist */}
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-[var(--music-bg-card)]" />
            <div className="h-2 w-1/4 rounded bg-[var(--music-bg-card)]" />
          </div>

          {/* Duration */}
          <div className="h-3 w-16 shrink-0 rounded bg-[var(--music-bg-card)]" />
        </div>
      ))}
    </div>
  );
}
