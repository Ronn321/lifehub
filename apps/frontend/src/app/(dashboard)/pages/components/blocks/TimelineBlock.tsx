'use client';

import { useState } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';

interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  description: string;
}

interface TimelineBlockProps {
  entries: TimelineEntry[];
  onChange: (data: { entries: TimelineEntry[] }) => void;
}

export function TimelineBlock({ entries, onChange }: TimelineBlockProps) {
  const addEntry = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    onChange({
      entries: [...entries, {
        id: crypto.randomUUID(),
        date: dateStr,
        title: '',
        description: '',
      }],
    });
  };

  const updateEntry = (id: string, field: keyof TimelineEntry, value: string) => {
    onChange({
      entries: entries.map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    });
  };

  const removeEntry = (id: string) => {
    onChange({ entries: entries.filter(entry => entry.id !== id) });
  };

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={entry.id} className="flex gap-3 group">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-brand-500 mt-1.5" />
            {index < entries.length - 1 && (
              <div className="w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-700 mt-1" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <input
                type="date"
                value={entry.date}
                onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                className="text-xs bg-transparent border-none outline-none text-fg-muted"
              />
              <button
                onClick={() => removeEntry(entry.id)}
                className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-red-500 transition-opacity ml-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              type="text"
              value={entry.title}
              onChange={(e) => updateEntry(entry.id, 'title', e.target.value)}
              placeholder="Titel..."
              className="w-full bg-transparent border-none outline-none text-sm font-medium"
            />
            <textarea
              value={entry.description}
              onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
              placeholder="Beschreibung..."
              className="w-full bg-transparent border-none outline-none text-sm text-fg-muted resize-none min-h-[1.5em]"
            />
          </div>
        </div>
      ))}
      <button
        onClick={addEntry}
        className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors"
      >
        <Plus className="h-4 w-4" /> Eintrag hinzufügen
      </button>
    </div>
  );
}
