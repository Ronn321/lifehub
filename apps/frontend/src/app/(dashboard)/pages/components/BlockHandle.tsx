'use client';

import { useState, useRef, useEffect } from 'react';
import {
  GripVertical, Trash2, Copy, ChevronUp, ChevronDown, Plus, History,
  Type, Heading, List, ListOrdered, CheckSquare,
  Image, Grid3X3, File, Minus, Quote, Code,
  Bookmark, Table2, ToggleLeft, MessageSquare, Link2,
} from 'lucide-react';

export type BlockType =
  | 'heading' | 'text' | 'image' | 'gallery' | 'file-list' | 'divider'
  | 'todo' | 'toggle' | 'callout' | 'quote' | 'code'
  | 'bookmark' | 'table' | 'page-reference'
  | 'checklist' | 'timeline' | 'embed' | 'video' | 'file' | 'link' | 'map'
  | 'research_workspace' | 'search';

const BLOCK_TYPE_OPTIONS: Array<{ type: BlockType; label: string; icon: React.ReactNode; category: string }> = [
  { type: 'text', label: 'Text', icon: <Type className="h-4 w-4" />, category: 'Basis' },
  { type: 'heading', label: 'Überschrift', icon: <Heading className="h-4 w-4" />, category: 'Basis' },
  { type: 'todo', label: 'Aufgabe', icon: <CheckSquare className="h-4 w-4" />, category: 'Basis' },
  { type: 'toggle', label: 'Einklappbar', icon: <ToggleLeft className="h-4 w-4" />, category: 'Basis' },
  { type: 'quote', label: 'Zitat', icon: <Quote className="h-4 w-4" />, category: 'Basis' },
  { type: 'code', label: 'Code', icon: <Code className="h-4 w-4" />, category: 'Basis' },
  { type: 'callout', label: 'Hinweis', icon: <MessageSquare className="h-4 w-4" />, category: 'Basis' },
  { type: 'bookmark', label: 'Link', icon: <Bookmark className="h-4 w-4" />, category: 'Medien' },
  { type: 'image', label: 'Bild', icon: <Image className="h-4 w-4" />, category: 'Medien' },
  { type: 'gallery', label: 'Galerie', icon: <Grid3X3 className="h-4 w-4" />, category: 'Medien' },
  { type: 'file-list', label: 'Dateiliste', icon: <File className="h-4 w-4" />, category: 'Medien' },
  { type: 'table', label: 'Tabelle', icon: <Table2 className="h-4 w-4" />, category: 'Struktur' },
  { type: 'divider', label: 'Trenner', icon: <Minus className="h-4 w-4" />, category: 'Struktur' },
  { type: 'page-reference', label: 'Seiten-Verweis', icon: <Link2 className="h-4 w-4" />, category: 'Struktur' },
];

interface BlockHandleProps {
  blockId: string;
  currentType: BlockType;
  onTypeChange: (newType: BlockType) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onShowHistory?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function BlockHandle({
  currentType,
  onTypeChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onShowHistory,
  dragHandleProps,
}: BlockHandleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = [...new Set(BLOCK_TYPE_OPTIONS.map((o) => o.category))];

  return (
    <div className="absolute -left-12 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
      {/* Add Block Menu (+ button) */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 rounded text-fg-subtle hover:text-fg hover:bg-bg-surface transition-colors"
          title="Block hinzufügen"
        >
          <Plus className="h-4 w-4" />
        </button>

        {showMenu && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-border py-1 z-50 max-h-[400px] overflow-hidden">
            {/* Search */}
            <div className="px-2 py-1 border-b border-border">
              <input
                type="text"
                placeholder="Block suchen..."
                className="w-full px-2 py-1.5 rounded-md border border-border bg-bg text-sm outline-none focus:border-brand-500"
                autoFocus
              />
            </div>
            
            {/* Move options */}
            {(onMoveUp || onMoveDown) && (
              <div className="px-2 py-1 border-b border-border">
                <div className="flex items-center gap-1">
                  {onMoveUp && (
                    <button
                      onClick={() => { onMoveUp(); setShowMenu(false); }}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-bg-surface transition-colors"
                    >
                      <ChevronUp className="h-3.5 w-3.5" /> Nach oben
                    </button>
                  )}
                  {onMoveDown && (
                    <button
                      onClick={() => { onMoveDown(); setShowMenu(false); }}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-bg-surface transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5" /> Nach unten
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Block type selector */}
            <div className="px-2 py-1 max-h-[300px] overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat}>
                  <div className="px-2 py-1 text-[10px] font-medium text-fg-muted uppercase tracking-wider">
                    {cat}
                  </div>
                  {BLOCK_TYPE_OPTIONS.filter((o) => o.category === cat).map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => {
                        onTypeChange(opt.type);
                        setShowMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                        currentType === opt.type
                          ? 'bg-brand-500/10 text-brand-500'
                          : 'hover:bg-bg-surface text-fg'
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="px-2 py-1 border-t border-border">
              <button
                onClick={() => { onDuplicate(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-bg-surface transition-colors"
              >
                <Copy className="h-3.5 w-3.5" /> Duplizieren
              </button>
              {onShowHistory && (
                <button
                  onClick={() => { onShowHistory(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-bg-surface transition-colors"
                >
                  <History className="h-3.5 w-3.5" /> Versionen
                </button>
              )}
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Loschen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drag Handle */}
      <button
        {...dragHandleProps}
        className="p-1 rounded text-fg-subtle hover:text-fg hover:bg-bg-surface transition-colors cursor-grab active:cursor-grabbing"
        title="Block verschieben"
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}
