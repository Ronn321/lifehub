'use client';

import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface ChecklistBlockProps {
  items: ChecklistItem[];
  onChange: (data: { items: ChecklistItem[] }) => void;
}

export function ChecklistBlock({ items, onChange }: ChecklistBlockProps) {
  const [newItemText, setNewItemText] = useState('');

  const addItem = () => {
    if (!newItemText.trim()) return;
    onChange({
      items: [...items, { id: crypto.randomUUID(), text: newItemText.trim(), checked: false }],
    });
    setNewItemText('');
  };

  const toggleItem = (id: string) => {
    onChange({
      items: items.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ),
    });
  };

  const updateItemText = (id: string, text: string) => {
    onChange({
      items: items.map(item =>
        item.id === id ? { ...item, text } : item
      ),
    });
  };

  const removeItem = (id: string) => {
    onChange({ items: items.filter(item => item.id !== id) });
  };

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-2 py-0.5 group">
          <button
            onClick={() => toggleItem(item.id)}
            className={`mt-1 flex-shrink-0 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-colors ${
              item.checked
                ? 'bg-brand-500 border-brand-500 text-white'
                : 'border-zinc-300 dark:border-zinc-600 hover:border-brand-500'
            }`}
          >
            {item.checked && <Check className="h-3 w-3" />}
          </button>
          <input
            type="text"
            value={item.text}
            onChange={(e) => updateItemText(item.id, e.target.value)}
            className={`flex-1 bg-transparent border-none outline-none text-sm py-0.5 ${
              item.checked ? 'line-through text-fg-muted' : 'text-fg'
            }`}
          />
          <button
            onClick={() => removeItem(item.id)}
            className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-red-500 transition-opacity"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 py-0.5">
        <Plus className="h-4 w-4 text-fg-muted" />
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Neues Element..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-fg-muted"
        />
      </div>
    </div>
  );
}
