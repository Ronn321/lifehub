'use client';

import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

// Pulsing placeholder block for loading lists and cards (UI_UX.md §3, §7.1).
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded bg-bg-raised', className)} />;
}
