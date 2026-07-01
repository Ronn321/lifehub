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
    <div>
      <button
        onClick={() => onChange({ label, content, isOpen: !isOpen })}
        className="w-full flex items-center gap-1.5 py-0.5 text-left hover:bg-bg-surface rounded transition-colors"
      >
        <ChevronRight
          className={`h-4 w-4 text-fg-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
        <span className="text-sm">{label || 'Toggle-Überschrift'}</span>
      </button>
      {isOpen && (
        <div className="pl-6 py-1 text-sm text-fg-muted">
          <textarea
            value={content}
            onChange={(e) => onChange({ label, content: e.target.value, isOpen })}
            placeholder="Inhalt eingeben..."
            className="w-full bg-transparent border-none outline-none resize-none min-h-[1.5em] text-sm"
          />
        </div>
      )}
    </div>
  );
}
