'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface ToggleBlockProps {
  label: string;
  content: string;
  isOpen: boolean;
  onChange: (data: { label: string; content: string; isOpen: boolean }) => void;
}

export function ToggleBlock({ label, content, isOpen, onChange }: ToggleBlockProps) {
  return (
    <div className="rounded-lg bg-bg-surface overflow-hidden">
      <button
        onClick={() => onChange({ label, content, isOpen: !isOpen })}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <ChevronRight
          className={`h-4 w-4 text-fg-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
        <span className="font-medium text-sm">{label || 'Toggle-Überschrift'}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-0 text-sm text-fg-muted border-t border-zinc-200 dark:border-zinc-800">
          <textarea
            value={content}
            onChange={(e) => onChange({ label, content: e.target.value, isOpen })}
            placeholder="Inhalt eingeben..."
            className="w-full bg-transparent border-none outline-none resize-none min-h-[60px] text-sm"
          />
        </div>
      )}
    </div>
  );
}
