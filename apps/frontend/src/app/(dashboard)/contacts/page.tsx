'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Plus, Search, Mail, Phone, Pencil, Trash2, Loader2,
  BookUser, AlertTriangle, RefreshCw,
} from 'lucide-react';

interface Contact {
  id: string;
  ownerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ContactListResponse {
  items: Contact[];
  total: number;
}

const COLOR_PALETTE = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]![0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : '';
  return (first + last).toUpperCase();
}

/* ─── Create / Edit Dialog ─── */
function ContactFormDialog({ open, initial, onClose, onSuccess }: {
  open: boolean;
  initial: Contact | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('');
  const [error, setError] = useState('');

  const isEdit = Boolean(initial);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setEmail(initial?.email ?? '');
      setPhone(initial?.phone ?? '');
      setNotes(initial?.notes ?? '');
      setColor(initial?.color ?? '');
      setError('');
    }
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        name,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        color: color || undefined,
      };
      return isEdit
        ? api.put<Contact>(`/contacts/${initial!.id}`, body)
        : api.post<Contact>('/contacts', body);
    },
    onSuccess: () => {
      setName(''); setEmail(''); setPhone(''); setNotes(''); setColor(''); setError('');
      onSuccess(); onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">{isEdit ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Name *</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="z.B. Max Mustermann"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">E-Mail</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="max@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Telefon</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="+49 170 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Notizen</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px] resize-y"
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Farbe</label>
            <div className="flex gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(color === c ? '' : c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-amber-500 dark:ring-offset-zinc-900' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Farbe ${c}`}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Speichern' : 'Kontakt anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Contact Card ─── */
function ContactCard({ contact, onEdit, onDelete }: {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:shadow-md transition-all group flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: contact.color ?? '#3F3F46' }}
          >
            {initials(contact.name)}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold truncate">{contact.name}</h3>
            {contact.color && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400" style={{ color: contact.color }}>
                {contact.color}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
            title="Bearbeiten"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            title="Löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400 min-w-0">
        {contact.email && (
          <p className="flex items-center gap-2 truncate">
            <Mail className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="truncate">{contact.email}</span>
          </p>
        )}
        {contact.phone && (
          <p className="flex items-center gap-2 truncate">
            <Phone className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="truncate">{contact.phone}</span>
          </p>
        )}
        {!contact.email && !contact.phone && (
          <p className="text-xs text-zinc-400">Keine Kontaktdaten</p>
        )}
      </div>
      {contact.notes && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{contact.notes}</p>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery<ContactListResponse>({
    queryKey: ['contacts', debouncedSearch],
    queryFn: () => api.get<ContactListResponse>(
      `/contacts?page=1&pageSize=100${debouncedSearch ? `&q=${encodeURIComponent(debouncedSearch)}` : ''}`,
    ),
  });

  const contacts = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contacts'] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kontakte</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {total === 1 ? '1 Kontakt' : `${total} Kontakte`}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Neuer Kontakt
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Kontakte durchsuchen (Name, E-Mail, Telefon)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-6 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-500 opacity-70" />
          <p className="text-red-700 dark:text-red-300 font-medium">Kontakte konnten nicht geladen werden.</p>
          <button
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Erneut versuchen
          </button>
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <BookUser className="h-14 w-14 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-zinc-500 dark:text-zinc-400">
            {debouncedSearch ? 'Keine Kontakte gefunden' : 'Keine Kontakte'}
          </p>
          {!debouncedSearch && (
            <p className="text-sm mt-1">Lege mit &bdquo;Neuer Kontakt&rdquo; deinen ersten Kontakt an.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              onEdit={() => { setEditing(c); setShowForm(true); }}
              onDelete={() => {
                if (window.confirm('Kontakt löschen?')) deleteMutation.mutate(c.id);
              }}
            />
          ))}
        </div>
      )}

      <ContactFormDialog
        open={showForm}
        initial={editing}
        onClose={() => setShowForm(false)}
        onSuccess={invalidate}
      />
    </div>
  );
}
