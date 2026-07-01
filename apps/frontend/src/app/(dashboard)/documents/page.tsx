'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Loader2, Plus, FileText, FileSignature, Receipt, BookOpen,
  FileBadge, Download, Trash2, ArrowLeft, Upload, Check,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface Document {
  id: string;
  name: string;
  type: 'contract' | 'receipt' | 'manual' | 'official' | 'other';
  description: string | null;
  mimeType: string | null;
  fileSize: number | null;
  storagePath: string | null;
  tags: string[] | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const typeLabels: Record<string, string> = {
  contract: 'Vertrag',
  receipt: 'Quittung',
  manual: 'Handbuch',
  official: 'Amtlich',
  other: 'Sonstiges',
};

const typeIcons: Record<string, React.ReactNode> = {
  contract: <FileSignature className="h-5 w-5" />,
  receipt: <Receipt className="h-5 w-5" />,
  manual: <BookOpen className="h-5 w-5" />,
  official: <FileBadge className="h-5 w-5" />,
  other: <FileText className="h-5 w-5" />,
};

const typeColors: Record<string, string> = {
  contract: 'bg-red-500/10 text-red-500',
  receipt: 'bg-green-500/10 text-green-500',
  manual: 'bg-blue-500/10 text-blue-500',
  official: 'bg-purple-500/10 text-purple-500',
  other: 'bg-amber-500/10 text-amber-500',
};

function formatDate(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatFileSize(bytes: number | null) {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  useEffect(() => { if (!accessToken) router.push('/login'); }, [accessToken, router]);

  const { data: docs, isLoading } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => api.get<Document[]>('/documents'),
    enabled: !!accessToken,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents'] }); setSelectedId(null); },
  });

  if (!accessToken) {
    return <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
    </div>;
  }

  const selected = selectedId ? docs?.find((d) => d.id === selectedId) ?? null : null;

  if (selectedId && selected) {
    return (
      <DetailView
        doc={selected}
        onBack={() => setSelectedId(null)}
        onDelete={(id) => deleteMutation.mutate(id)}
        isDeleting={deleteMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dokumente</h1>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Upload className="h-4 w-4" /> Hochladen
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(() => {
          if (isLoading) {
            return (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
              </div>
            );
          }
          if (!docs || docs.length === 0) {
            return (
              <div className="col-span-full text-center py-12 text-fg-muted">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Keine Dokumente vorhanden</p>
                <button onClick={() => setShowUpload(true)}
                  className="mt-3 text-sm text-brand-500 hover:underline"
                >Jetzt erstes Dokument hochladen</button>
              </div>
            );
          }
          return (docs ?? []).map((doc) => (
            <button key={doc.id} onClick={() => setSelectedId(doc.id)}
              className="text-left rounded-lg border border-border bg-bg-surface p-4 hover:border-brand-500/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={cn('p-2.5 rounded-full shrink-0', typeColors[doc.type] ?? typeColors.other)}>
                  {typeIcons[doc.type] ?? typeIcons.other}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {typeLabels[doc.type] ?? doc.type}
                    {doc.fileSize !== null && <span className="ml-2">{formatFileSize(doc.fileSize)}</span>}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-fg-muted">
                <span>{formatDate(doc.updatedAt)}</span>
                {doc.mimeType && <span className="truncate max-w-[120px]">{doc.mimeType}</span>}
              </div>
            </button>
          ));
        })()}
      </div>

      {showUpload && <UploadDialog onClose={() => setShowUpload(false)} />}
    </div>
  );
}

function DetailView({ doc, onBack, onDelete, isDeleting }: {
  doc: Document;
  onBack: () => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const accessToken = useAuthStore.getState().accessToken;
      const base = `http://${window.location.hostname}:3007/api/v1`
      const res = await fetch(`${base}/documents/${doc.id}/download`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) throw new Error('Download fehlgeschlagen');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors"
      ><ArrowLeft className="h-4 w-4" /> Zurück</button>

      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className={cn('p-3 rounded-full shrink-0', typeColors[doc.type] ?? typeColors.other)}>
            {typeIcons[doc.type] ?? typeIcons.other}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold break-words">{doc.name}</h2>
            <p className="text-sm text-fg-muted mt-1">{typeLabels[doc.type] ?? doc.type}</p>
          </div>
          <button onClick={() => onDelete(doc.id)} disabled={isDeleting}
            className="p-2 rounded-md text-fg-muted hover:text-danger hover:bg-danger/10 transition-colors"
          ><Trash2 className="h-4 w-4" /></button>
        </div>

        <div className="mt-6 space-y-4">
          {doc.description && (
            <div>
              <p className="text-xs text-fg-muted mb-1">Beschreibung</p>
              <p className="text-sm whitespace-pre-wrap rounded-lg border border-border p-3 bg-bg">{doc.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {doc.mimeType && (
              <div>
                <p className="text-xs text-fg-muted mb-1">Dateityp</p>
                <p className="text-sm font-medium">{doc.mimeType}</p>
              </div>
            )}
            {doc.fileSize !== null && (
              <div>
                <p className="text-xs text-fg-muted mb-1">Größe</p>
                <p className="text-sm font-medium">{formatFileSize(doc.fileSize)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-fg-muted mb-1">Erstellt</p>
              <p className="text-sm font-medium">{formatDate(doc.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted mb-1">Zuletzt geändert</p>
              <p className="text-sm font-medium">{formatDate(doc.updatedAt)}</p>
            </div>
          </div>

          {doc.tags && doc.tags.length > 0 && (
            <div>
              <p className="text-xs text-fg-muted mb-1">Tags</p>
              <div className="flex flex-wrap gap-2">
                {doc.tags.map((tag) => (
                  <span key={tag}
                    className="rounded-full bg-brand-500/10 text-brand-500 px-2.5 py-0.5 text-xs font-medium"
                  >{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {doc.storagePath && (
          <button onClick={handleDownload} disabled={downloading}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? 'Wird heruntergeladen...' : 'Herunterladen'}
          </button>
        )}
      </div>
    </div>
  );
}

function UploadDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '', type: 'other', description: '', tags: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.name || !file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', form.name);
      fd.append('type', form.type);
      if (form.description) fd.append('description', form.description);
      if (form.tags) {
        const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
        tags.forEach((t) => fd.append('tags[]', t));
      }
      await api.upload('/documents', fd);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="rounded-lg border border-border bg-bg-surface p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Dokument hochladen</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-brand-500/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="text-center">
                <Check className="h-6 w-6 text-green-500 mx-auto mb-1" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-fg-muted mt-0.5">{formatFileSize(file.size)}</p>
              </div>
            ) : (
              <div className="text-center text-fg-muted">
                <Upload className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Datei auswählen</p>
                <p className="text-xs mt-1">Max. 50 MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <input name="name" placeholder="Dateiname *" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <select name="type" value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <textarea name="description" placeholder="Beschreibung (optional)" rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <input name="tags" placeholder="Tags (kommagetrennt, optional)" value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-bg transition-colors"
          >Abbrechen</button>
          <button onClick={handleSubmit} disabled={uploading || !form.name || !file}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >{uploading ? 'Wird hochgeladen...' : 'Hochladen'}</button>
        </div>
      </div>
    </div>
  );
}
