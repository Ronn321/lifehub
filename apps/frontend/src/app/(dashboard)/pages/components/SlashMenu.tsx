'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { cn } from '@/lib/cn';
import { blockRegistry } from '@/lib/blockRegistry';

/* ─── TipTap Extension ─── */

/**
 * SlashMenuExtension broadcasts a custom DOM event when '/' is typed
 * at the start of a paragraph so the React UI can react to it.
 */
export const SlashMenuExtension = Extension.create({
  name: 'slashMenu',

  addKeyboardShortcuts() {
    return {
      '/': () => {
        const { editor } = this;
        const { selection } = editor.state;
        const { $from } = selection;
        const isAtStart = $from.parentOffset === 0;
        const isParagraph = $from.parent.type.name === 'paragraph';

        if (isAtStart && isParagraph) {
          // Dispatch a custom event the React component listens for
          window.dispatchEvent(new CustomEvent('slash-menu-open'));
          return true;
        }
        return false;
      },
    };
  },
});

/* ─── Props ─── */

interface SlashMenuProps {
  editor: Editor | null;
  onSelect: (blockType: string) => void;
  onClose: () => void;
}

/* ─── Component ─── */

export function SlashMenu({ editor, onSelect, onClose }: SlashMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allEntries = blockRegistry.getAll();
  const filtered = search
    ? allEntries.filter((e) =>
        e.label.toLowerCase().includes(search.toLowerCase()),
      )
    : allEntries;

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSearch('');
    setSelectedIndex(0);
    // Focus the search input after render
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    editor?.commands.focus();
    onClose();
  }, [editor, onClose]);

  // Listen for the slash key event from the extension
  useEffect(() => {
    const handler = () => handleOpen();
    window.addEventListener('slash-menu-open', handler);
    return () => window.removeEventListener('slash-menu-open', handler);
  }, [handleOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, handleClose]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].type);
          handleClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
    }
  };

  if (!editor || !isOpen) return null;

  const categories = [...new Set(filtered.map((e) => e.category))];

  return (
    <div
      ref={menuRef}
      className="absolute left-0 top-full mt-1 z-50 w-72 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* Search */}
      <div className="px-2 py-2 border-b border-zinc-200 dark:border-zinc-700">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Block suchen..."
          className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
        />
      </div>

      {/* Block list */}
      <div className="max-h-[320px] overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-zinc-400">
            Keine Blöcke gefunden
          </div>
        ) : search ? (
          // Flat list when searching
          filtered.map((entry, idx) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.type}
                onClick={() => {
                  onSelect(entry.type);
                  handleClose();
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors',
                  idx === selectedIndex
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{entry.label}</span>
              </button>
            );
          })
        ) : (
          // Grouped by category
          categories.map((cat) => (
            <div key={cat}>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {cat}
              </div>
              {filtered
                .filter((e) => e.category === cat)
                .map((entry, idx) => {
                  const Icon = entry.icon;
                  const globalIdx = filtered.indexOf(entry);
                  return (
                    <button
                      key={entry.type}
                      onClick={() => {
                        onSelect(entry.type);
                        handleClose();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors',
                        globalIdx === selectedIndex
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{entry.label}</span>
                    </button>
                  );
                })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
