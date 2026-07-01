'use client';

import { useState, useEffect, useRef } from 'react';

type CalloutVariant = 'info' | 'warning' | 'error' | 'success';

interface CalloutBlockProps {
  icon: string;
  variant: CalloutVariant;
  text: string;
  onChange: (data: { icon: string; variant: CalloutVariant; text: string }) => void;
}

const VARIANT_STYLES: Record<CalloutVariant, string> = {
  info: 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700',
  warning: 'bg-yellow-50/50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700',
  error: 'bg-red-50/50 dark:bg-red-950/30 border-red-300 dark:border-red-700',
  success: 'bg-green-50/50 dark:bg-green-950/30 border-green-300 dark:border-green-700',
};

const ICONS = ['💡', '⚠️', '❌', '✅', '🔔', '📝', '🚀', '❓'];

export function CalloutBlock({ icon, variant, text, onChange }: CalloutBlockProps) {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showIconPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowIconPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showIconPicker]);

  return (
    <div className={`relative rounded-md border-l-4 border px-3 py-2 ${VARIANT_STYLES[variant]}`}>
      <div className="flex items-start gap-2">
        <div ref={pickerRef} className="relative">
          <button
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="text-lg hover:scale-110 transition-transform leading-none"
          >
            {icon}
          </button>
          {showIconPicker && (
            <div className="absolute top-full left-0 z-10 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 p-2 flex gap-1">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => {
                    onChange({ icon: ic, variant, text });
                    setShowIconPicker(false);
                  }}
                  className="text-lg hover:scale-110 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {ic}
                </button>
              ))}
            </div>
          )}
        </div>
        <textarea
          value={text}
          onChange={(e) => onChange({ icon, variant, text: e.target.value })}
          placeholder="Hinweis eingeben..."
          className="flex-1 bg-transparent border-none outline-none resize-none text-sm min-h-[1.5em]"
        />
        <select
          value={variant}
          onChange={(e) => onChange({ icon, variant: e.target.value as CalloutVariant, text })}
          className="text-xs border border-zinc-300 dark:border-zinc-700 rounded px-1 py-0.5 bg-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <option value="info">Info</option>
          <option value="warning">Warnung</option>
          <option value="error">Fehler</option>
          <option value="success">Erfolg</option>
        </select>
      </div>
    </div>
  );
}
