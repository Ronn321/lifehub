'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface SidebarNavButtonProps {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
  collapsed?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Sidebar Navigation Button                                         */
/* ------------------------------------------------------------------ */
/**
 * A single navigation button inside the music sidebar.
 * 48px tall, shows a Lucide icon + text label.
 * Uses Next.js Link for client-side navigation.
 */
export function SidebarNavButton({
  icon: Icon,
  label,
  href,
  active = false,
  collapsed = false,
}: SidebarNavButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-2 text-sm font-medium transition-colors',
        collapsed ? 'justify-center h-10 w-full' : 'h-12',
        active
          ? 'bg-[var(--music-bg-card)] text-[var(--music-text-primary)]'
          : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
