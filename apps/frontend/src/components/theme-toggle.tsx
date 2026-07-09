'use client';
import { useThemeStore } from '@/lib/theme-store';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const options: { value: 'light' | 'dark' | 'system'; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Hell' },
    { value: 'dark', icon: Moon, label: 'Dunkel' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className={cn(
      'flex items-center gap-1 rounded-md border border-border bg-bg',
      compact ? 'p-1 flex-col' : 'p-1',
    )}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
              compact ? 'justify-center px-1' : '',
              active
                ? 'bg-brand-500/10 text-brand-500'
                : 'text-fg-muted hover:text-fg hover:bg-bg-raised',
            )}
            title={opt.label}
            aria-label={opt.label}
          >
            <Icon className="h-3.5 w-3.5" />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
