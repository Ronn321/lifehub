'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

interface TodoBlockProps {
  checked: boolean;
  text: string;
  onChange: (data: { checked: boolean; text: string }) => void;
}

export function TodoBlock({ checked, text, onChange }: TodoBlockProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-bg-surface group">
      <button
        onClick={() => onChange({ checked: !checked, text })}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-brand-500 border-brand-500 text-white'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-brand-500'
        }`}
      >
        {checked && <Check className="h-3 w-3" />}
      </button>
      <input
        type="text"
        value={text}
        onChange={(e) => onChange({ checked, text: e.target.value })}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        placeholder="Aufgabe..."
        className={`flex-1 bg-transparent border-none outline-none text-sm ${
          isEditing ? 'ring-1 ring-brand-500 rounded px-1' : ''
        } ${checked ? 'line-through text-fg-muted' : 'text-fg'}`}
      />
    </div>
  );
}
