'use client';
import { cn } from '@/lib/cn';
import { Inbox, Send, Trash2, Archive, SquarePen } from 'lucide-react';
import { FOLDERS, type FolderKey } from './types';

const FOLDER_ICONS: Record<FolderKey, React.ReactNode> = {
  inbox: <Inbox className="h-4 w-4 shrink-0" />,
  sent: <Send className="h-4 w-4 shrink-0" />,
  trash: <Trash2 className="h-4 w-4 shrink-0" />,
  archive: <Archive className="h-4 w-4 shrink-0" />,
};

interface FolderSidebarProps {
  selectedLabel: FolderKey;
  onSelect: (key: FolderKey) => void;
  unreadInbox: number;
  onCompose: () => void;
}

export function FolderSidebar({ selectedLabel, onSelect, unreadInbox, onCompose }: FolderSidebarProps) {
  return (
    <div className="flex w-full flex-col border-b border-border bg-bg-surface lg:h-full lg:w-[200px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="p-2 lg:p-3">
        <button
          onClick={onCompose}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          <SquarePen className="h-4 w-4" />
          Verfassen
        </button>
      </div>
      <nav className="flex shrink-0 gap-0.5 overflow-x-auto px-2 pb-2 lg:flex-1 lg:flex-col lg:gap-0.5 lg:overflow-y-auto lg:px-2 lg:py-2">
        {FOLDERS.map((folder) => {
          const active = selectedLabel === folder.key;
          return (
            <button
              key={folder.key}
              onClick={() => onSelect(folder.key)}
              className={cn(
                'flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-brand-500/10 font-medium text-brand-500'
                  : 'text-fg-muted hover:bg-bg hover:text-fg',
              )}
            >
              {FOLDER_ICONS[folder.key]}
              <span className="text-left">{folder.label}</span>
              {folder.key === 'inbox' && unreadInbox > 0 && (
                <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-semibold leading-none text-white">
                  {unreadInbox}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
