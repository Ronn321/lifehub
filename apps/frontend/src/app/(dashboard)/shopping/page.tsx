'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Plus, ShoppingCart, Store, Trash2, MoreHorizontal,
  ChevronLeft, Loader2, Check, Circle, Archive,
} from 'lucide-react';

interface ShoppingList {
  id: string;
  title: string;
  ownerId: string;
  color: string | null;
  store: string | null;
  isArchived: boolean;
  itemCount: number;
  checkedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  amount: string | null;
  unit: string | null;
  category: string | null;
  checked: boolean;
  checkedBy: string | null;
  ord: number;
  recipeRefId: string | null;
  createdAt: string;
}

interface ShoppingListDetail {
  id: string;
  title: string;
  ownerId: string;
  color: string | null;
  store: string | null;
  isArchived: boolean;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
}

/* ─── Create List Dialog ─── */
function CreateListDialog({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [store, setStore] = useState('');
  const [color, setColor] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<ShoppingList>('/shopping-lists', {
      title,
      store: store || undefined,
      color: color || undefined,
    }),
    onSuccess: () => {
      setTitle(''); setStore(''); setColor(''); setError('');
      onSuccess(); onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Neue Einkaufsliste</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Titel</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="z.B. Wocheneinkauf"
              value={title} onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Geschäft (optional)</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="z.B. Edeka"
              value={store} onChange={(e) => setStore(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Farbe (optional)</label>
            <div className="flex gap-2">
              {['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(color === c ? '' : c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-amber-500 dark:ring-offset-zinc-900' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={() => mutation.mutate()}
            disabled={!title || mutation.isPending}
            className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Liste anlegen
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── List Card ─── */
function ListCard({ list, onClick, onDelete, onArchive }: {
  list: ShoppingList; onClick: () => void; onDelete: () => void; onArchive: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const progress = list.itemCount > 0 ? Math.round((list.checkedCount / list.itemCount) * 100) : 0;

  return (
    <div
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md transition-all cursor-pointer overflow-hidden relative group"
      onClick={onClick}
    >
      {list.color && (
        <div className="h-1.5" style={{ backgroundColor: list.color }} />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-amber-500" />
              {list.store && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1">
                  <Store className="h-3 w-3" /> {list.store}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold truncate pr-2">{list.title}</h3>
          </div>
          <div className="relative shrink-0">
            <button
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg py-1 min-w-[140px]">
                <button
                  className="w-full text-left px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onArchive(); }}
                >
                  <Archive className="h-3.5 w-3.5" /> Archivieren
                </button>
                <button
                  className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Löschen
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          <span>{list.checkedCount} / {list.itemCount} Artikel erledigt</span>
        </div>
        {list.itemCount > 0 && (
          <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Item Row ─── */
function ItemRow({ item, onToggle, onDelete }: {
  item: ShoppingItem; onToggle: () => void; onDelete: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${item.checked ? 'bg-zinc-50 dark:bg-zinc-800/30 opacity-60' : 'bg-zinc-50 dark:bg-zinc-800/50'}`}>
      <button
        onClick={onToggle}
        className={`shrink-0 rounded-full transition-colors ${item.checked ? 'text-amber-500' : 'text-zinc-400 hover:text-amber-500'}`}
      >
        {item.checked ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${item.checked ? 'line-through text-zinc-400' : ''}`}>
            {item.name}
          </span>
          {item.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
              {item.category}
            </span>
          )}
        </div>
        {(item.amount || item.unit) && (
          <p className="text-xs text-zinc-400 mt-0.5">
            {[item.amount, item.unit].filter(Boolean).join(' ')}
          </p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─── Detail View ─── */
function ListDetailView({ listId, onBack }: { listId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');

  const { data: list, isLoading } = useQuery<ShoppingListDetail>({
    queryKey: ['shopping-list', listId],
    queryFn: () => api.get<ShoppingListDetail>(`/shopping-lists/${listId}`),
  });

  const addItemMutation = useMutation({
    mutationFn: () => api.post(`/shopping-lists/${listId}/items`, {
      name: newName,
      amount: newAmount || undefined,
      unit: newUnit || undefined,
      category: newCategory || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      setNewName(''); setNewAmount(''); setNewUnit(''); setNewCategory(''); setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/shopping-lists/${listId}/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      checked
        ? api.post(`/shopping-lists/${listId}/items/${itemId}/uncheck`)
        : api.post(`/shopping-lists/${listId}/items/${itemId}/check`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.put(`/shopping-lists/${listId}`, { isArchived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      onBack();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Einkaufsliste nicht gefunden.</p>
        <button onClick={onBack} className="mt-2 text-sm text-amber-600 hover:underline">
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  const categories = [...new Set(list.items.map((i) => i.category).filter(Boolean))] as string[];
  const grouped = categories.length > 0
    ? Object.fromEntries(
        categories.map((cat) => [
          cat,
          list.items.filter((i) => i.category === cat),
        ]),
      )
    : { Alle: list.items };

  const uncheckedCount = list.items.filter((i) => !i.checked).length;
  const checkedCount = list.items.filter((i) => i.checked).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-2 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Zurück
          </button>
          <div className="flex items-center gap-2">
            {list.color && (
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
            )}
            <h2 className="text-2xl font-bold">{list.title}</h2>
          </div>
          {list.store && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
              <Store className="h-3.5 w-3.5" /> {list.store}
            </p>
          )}
          <p className="text-sm text-zinc-400 mt-1">
            {uncheckedCount} offen · {checkedCount} erledigt
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => archiveMutation.mutate()}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
          >
            <Archive className="h-3.5 w-3.5" /> Archivieren
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Add Item Form */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs text-muted-foreground mb-1">Artikel</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="z.B. Milch"
              value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newName) addItemMutation.mutate(); }}
            />
          </div>
          <div className="w-20">
            <label className="block text-xs text-muted-foreground mb-1">Menge</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="2"
              value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
            />
          </div>
          <div className="w-20">
            <label className="block text-xs text-muted-foreground mb-1">Einheit</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Liter"
              value={newUnit} onChange={(e) => setNewUnit(e.target.value)}
            />
          </div>
          <div className="w-28">
            <label className="block text-xs text-muted-foreground mb-1">Kategorie</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Obst"
              value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
            />
          </div>
          <button
            onClick={() => addItemMutation.mutate()}
            disabled={!newName || addItemMutation.isPending}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            {addItemMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Items by Category */}
      {list.items.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Noch keine Artikel auf dieser Liste.</p>
          <p className="text-sm mt-1">Füge oben den ersten Artikel hinzu.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="space-y-2">
            {category !== 'Alle' && (
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 px-1">{category}</h3>
            )}
            <div className="space-y-1.5">
              {items.map((item) => (
                <div key={item.id} className="group">
                  <ItemRow
                    item={item}
                    onToggle={() => toggleItemMutation.mutate({ itemId: item.id, checked: item.checked })}
                    onDelete={() => {
                      if (window.confirm(`"${item.name}" löschen?`)) deleteItemMutation.mutate(item.id);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function ShoppingPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const { data: lists, isLoading } = useQuery<ShoppingList[]>({
    queryKey: ['shopping-lists'],
    queryFn: () => api.get<ShoppingList[]>('/shopping-lists'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shopping-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/shopping-lists/${id}`, { isArchived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  if (selectedListId) {
    return <ListDetailView listId={selectedListId} onBack={() => setSelectedListId(null)} />;
  }

  const activeLists = lists?.filter((l) => !l.isArchived) ?? [];
  const archivedLists = lists?.filter((l) => l.isArchived) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Einkaufslisten</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {activeLists.length} aktive Listen
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Neue Liste
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 animate-pulse">
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
              <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
              <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : activeLists.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Noch keine Einkaufslisten</p>
          <p className="text-sm mt-1">Erstelle deine erste Einkaufsliste.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Neue Liste
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeLists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onClick={() => setSelectedListId(list.id)}
              onDelete={() => { if (window.confirm(`"${list.title}" löschen?`)) deleteMutation.mutate(list.id); }}
              onArchive={() => archiveMutation.mutate(list.id)}
            />
          ))}
        </div>
      )}

      {archivedLists.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-400 mb-3">Archivierte Listen</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {archivedLists.map((list) => (
              <div
                key={list.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 opacity-60 cursor-pointer hover:opacity-100 transition-opacity"
                onClick={() => setSelectedListId(list.id)}
              >
                <h3 className="font-semibold truncate">{list.title}</h3>
                <p className="text-sm text-zinc-400 mt-1">{list.itemCount} Artikel</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateListDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['shopping-lists'] })}
      />
    </div>
  );
}
