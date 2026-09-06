'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Plus, Trash2, MoreHorizontal, ChevronLeft, Loader2,
  Github, Youtube, FileText, Link2, Edit3, ExternalLink,
} from 'lucide-react';

interface ProjectItem {
  id: string;
  title: string;
  description: string | null;
  type: 'planning' | 'building' | 'done' | 'archived';
  status: '3d_print' | 'arduino' | 'raspi' | 'code' | 'electronics' | 'diy';
  coverMediaId: string | null;
  githubUrl: string | null;
  youtubeUrl: string | null;
  ownerId: string;
  files: ProjectFileItem[];
  notes: ProjectNoteItem[];
  links: ProjectLinkItem[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectFileItem {
  id: string;
  projectId: string;
  filename: string;
  mimeType: string | null;
  fileSize: number | null;
  kind: string;
  createdAt: string;
}

interface ProjectNoteItem {
  id: string;
  projectId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectLinkItem {
  id: string;
  projectId: string;
  url: string;
  label: string | null;
  type: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  planning: 'Planung', building: 'In Bau', done: 'Fertig', archived: 'Archiviert',
};

const TYPE_COLORS: Record<string, string> = {
  planning: 'bg-warning/10 text-warning border border-warning/30',
  building: 'bg-info/10 text-info border border-info/30',
  done: 'bg-success/10 text-success border border-success/30',
  archived: 'bg-bg-raised text-fg-muted border border-border',
};

const STATUS_LABELS: Record<string, string> = {
  '3d_print': '3D-Druck', arduino: 'Arduino', raspi: 'Raspberry Pi',
  code: 'Software', electronics: 'Elektronik', diy: 'DIY',
};

const STATUS_COLORS: Record<string, string> = {
  '3d_print': 'bg-warning/10 text-warning border border-warning/30',
  arduino: 'bg-success/10 text-success border border-success/30',
  raspi: 'bg-danger/10 text-danger border border-danger/30',
  code: 'bg-info/10 text-info border border-info/30',
  electronics: 'bg-info/10 text-info border border-info/30',
  diy: 'bg-brand-500/10 text-brand-500 border border-brand-500/30',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ProjectCreateDialog({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('planning');
  const [status, setStatus] = useState('3d_print');
  const [githubUrl, setGithubUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<ProjectItem>('/projects', {
      title, description: description || undefined,
      type, status,
      githubUrl: githubUrl || null,
      youtubeUrl: youtubeUrl || null,
    }),
    onSuccess: () => {
      setTitle(''); setDescription(''); setType('planning'); setStatus('3d_print');
      setGithubUrl(''); setYoutubeUrl(''); setError('');
      onSuccess(); onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-bg-surface rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Neues Projekt</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Titel</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="z.B. LED-Würfel"
              value={title} onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Beschreibung (optional)</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[80px] resize-y"
              placeholder="Projektbeschreibung im Markdown..."
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Typ</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={status} onChange={(e) => setStatus(e.target.value)}
              >
                <option value="3d_print">3D-Druck</option>
                <option value="arduino">Arduino</option>
                <option value="raspi">Raspberry Pi</option>
                <option value="code">Software</option>
                <option value="electronics">Elektronik</option>
                <option value="diy">DIY</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Status</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={type} onChange={(e) => setType(e.target.value)}
              >
                <option value="planning">Planung</option>
                <option value="building">In Bau</option>
                <option value="done">Fertig</option>
                <option value="archived">Archiviert</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">GitHub-URL (optional)</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="https://github.com/..."
              value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">YouTube-URL (optional, nur /embed/)</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="https://www.youtube.com/embed/..."
              value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            onClick={() => mutation.mutate()}
            disabled={!title || mutation.isPending}
            className="w-full py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Projekt anlegen
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick, onDelete }: {
  project: ProjectItem; onClick: () => void; onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="rounded-xl border border-border bg-bg-surface hover:shadow-md transition-all cursor-pointer overflow-hidden relative group"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate pr-2">{project.title}</h3>
            {project.description && (
              <p className="text-sm text-fg-muted mt-1 line-clamp-2">{project.description}</p>
            )}
          </div>
          <div className="relative shrink-0">
            <button
              className="p-1.5 rounded-lg hover:bg-bg-raised opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                <button
                  className="w-full text-left px-3 py-1.5 text-sm text-danger hover:bg-bg-raised flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Löschen
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[project.type]}`}>
            {TYPE_LABELS[project.type]}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
            {STATUS_LABELS[project.status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-fg-muted">
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {project.notes.length} Notizen
          </span>
          <span className="flex items-center gap-1">
            <Link2 className="h-3.5 w-3.5" />
            {project.links.length} Links
          </span>
          <span className="flex items-center gap-1">
            <Edit3 className="h-3.5 w-3.5" />
            {formatDate(project.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProjectDetailView({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'notes' | 'links'>('overview');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkType, setNewLinkType] = useState('other');
  const [error, setError] = useState('');

  const { data: project, isLoading, error: loadError } = useQuery<ProjectItem>({
    queryKey: ['project', projectId],
    queryFn: () => api.get<ProjectItem>(`/projects/${projectId}`),
  });

  const addNoteMutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/notes`, { content: newNoteContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewNoteContent(''); setError('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      api.put(`/projects/${projectId}/notes/${noteId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setEditNoteId(null); setEditNoteContent(''); setError('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.delete(`/projects/${projectId}/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
  });

  const addLinkMutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/links`, {
      url: newLinkUrl, label: newLinkLabel || undefined, type: newLinkType,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setNewLinkUrl(''); setNewLinkLabel(''); setNewLinkType('other'); setError('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: string) => api.delete(`/projects/${projectId}/links/${linkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onBack();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: Partial<{ type: string; status: string }>) =>
      api.put(`/projects/${projectId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Fehler'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-20 bg-bg-raised rounded" />
        <div className="h-8 w-48 bg-bg-raised rounded" />
        <div className="h-32 bg-bg-raised rounded-xl" />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Projekt nicht gefunden.</p>
        <button onClick={onBack} className="mt-2 text-sm text-brand-500 hover:underline">
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-2 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Zurück
          </button>
          <h2 className="text-2xl font-bold">{project.title}</h2>
          {project.description && (
            <p className="text-fg-muted mt-1 whitespace-pre-wrap">{project.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-sm text-fg-muted">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[project.type]}`}>
              {TYPE_LABELS[project.type]}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
              {STATUS_LABELS[project.status]}
            </span>
            <span>Erstellt {formatDate(project.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={project.status}
            onChange={(e) => updateProjectMutation.mutate({ status: e.target.value })}
            className="text-sm rounded-lg border border-border px-2 py-1.5 bg-transparent"
          >
            <option value="3d_print">3D-Druck</option>
            <option value="arduino">Arduino</option>
            <option value="raspi">Raspberry Pi</option>
            <option value="code">Software</option>
            <option value="electronics">Elektronik</option>
            <option value="diy">DIY</option>
          </select>
          <select
            value={project.type}
            onChange={(e) => updateProjectMutation.mutate({ type: e.target.value })}
            className="text-sm rounded-lg border border-border px-2 py-1.5 bg-transparent"
          >
            <option value="planning">Planung</option>
            <option value="building">In Bau</option>
            <option value="done">Fertig</option>
            <option value="archived">Archiviert</option>
          </select>
          <button
            onClick={() => { if (window.confirm('Wirklich löschen?')) deleteProjectMutation.mutate(); }}
            className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['overview', 'notes', 'links'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            {t === 'overview' ? 'Übersicht' :
             t === 'notes' ? 'Notizen' : 'Links'}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-danger/10 border border-danger/30 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Notizen', value: project.notes.length, icon: FileText },
              { label: 'Links', value: project.links.length, icon: Link2 },
              { label: 'Dateien', value: project.files.length, icon: Edit3 },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-bg-surface p-4">
                <span className="flex items-center gap-1 text-sm text-fg-muted mb-2">
                  <stat.icon className="h-4 w-4" /> {stat.label}
                </span>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {project.githubUrl && (
            <div className="rounded-xl border border-border bg-bg-surface p-4">
              <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                <Github className="h-4 w-4" /> GitHub
              </h3>
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer"
                className="text-brand-500 hover:underline text-sm flex items-center gap-1"
              >
                {project.githubUrl} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {project.youtubeUrl && (
            <div className="rounded-xl border border-border bg-bg-surface p-4">
              <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                <Youtube className="h-4 w-4" /> YouTube
              </h3>
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={project.youtubeUrl}
                  width="100%" height="100%"
                  className="border-0"
                  title="YouTube Video"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[100px] resize-y text-sm"
              placeholder="Neue Notiz im Markdown..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
            />
            <button
              onClick={() => addNoteMutation.mutate()}
              disabled={!newNoteContent.trim()}
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium"
            >
              Notiz hinzufügen
            </button>
          </div>

          {project.notes.length === 0 && (
            <p className="text-sm text-fg-muted text-center py-8">Noch keine Notizen.</p>
          )}

          {project.notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-border bg-bg-surface p-4">
              {editNoteId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[100px] resize-y text-sm"
                    value={editNoteContent}
                    onChange={(e) => setEditNoteContent(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateNoteMutation.mutate({ noteId: note.id, content: editNoteContent })}
                      disabled={!editNoteContent.trim()}
                      className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-medium"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={() => { setEditNoteId(null); setEditNoteContent(''); }}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditNoteId(note.id); setEditNoteContent(note.content); }}
                        className="p-1 rounded hover:bg-bg-raised transition-colors"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (window.confirm('Notiz löschen?')) deleteNoteMutation.mutate(note.id); }}
                        className="p-1 rounded hover:bg-danger/10 transition-colors text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-fg-subtle mt-2">{formatDate(note.createdAt)}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'links' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <input placeholder="URL"
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)}
            />
            <input placeholder="Label"
              className="w-32 px-3 py-2 rounded-lg border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)}
            />
            <select
              className="w-28 px-3 py-2 rounded-lg border border-border bg-transparent text-sm"
              value={newLinkType} onChange={(e) => setNewLinkType(e.target.value)}
            >
              <option value="other">Sonstiges</option>
              <option value="github">GitHub</option>
              <option value="youtube">YouTube</option>
            </select>
            <button
              onClick={() => addLinkMutation.mutate()}
              disabled={!newLinkUrl}
              className="px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {project.links.length === 0 && (
            <p className="text-sm text-fg-muted text-center py-8">Noch keine Links hinzugefügt.</p>
          )}

          {project.links.map((link) => (
            <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg bg-bg border border-border">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 shrink-0">
                {link.type === 'github' ? <Github className="h-4 w-4" /> :
                 link.type === 'youtube' ? <Youtube className="h-4 w-4" /> :
                 <Link2 className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{link.label || link.url}</p>
                <p className="text-xs text-fg-muted truncate">{link.url}</p>
              </div>
              <a href={link.url} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-bg-raised transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-fg-muted" />
              </a>
              <button
                onClick={() => { if (window.confirm('Link löschen?')) deleteLinkMutation.mutate(link.id); }}
                className="p-2 rounded-lg hover:bg-danger/10 transition-colors text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const deleteProjectCardMutation = useMutation({
    mutationFn: (projectId: string) => api.delete(`/projects/${projectId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    onError: (err) => console.error(err),
  });

  const { data: projects, isLoading, error } = useQuery<ProjectItem[]>({
    queryKey: ['projects'],
    queryFn: () => api.get<ProjectItem[]>('/projects'),
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (!accessToken) router.push('/login');
  }, [accessToken, router]);

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-fg-subtle" />
      </div>
    );
  }

  if (selectedProjectId) {
    return <ProjectDetailView projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />;
  }

  const filtered = projects?.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projekte</h1>
          <p className="text-fg-muted mt-1">
            Alle deine Maker- und Code-Projekte an einem Ort
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Neues Projekt
        </button>
      </div>

      <div className="relative">
        <input
          placeholder="Projekt suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 pl-10 rounded-lg border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border p-5 animate-pulse">
              <div className="h-6 w-3/4 bg-bg-raised rounded mb-3" />
              <div className="h-4 w-full bg-bg-raised rounded mb-2" />
              <div className="h-4 w-2/3 bg-bg-raised rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-danger">Fehler beim Laden der Projekte.</p>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })} className="mt-2 text-sm text-brand-500 hover:underline">
            Erneut versuchen
          </button>
        </div>
      )}

      {projects && filtered?.length === 0 && (
        <div className="text-center py-16">
          <div className="h-12 w-12 mx-auto text-fg-subtle mb-4 flex items-center justify-center">
            <Edit3 className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium mb-2">Noch keine Projekte</h3>
          <p className="text-fg-muted mb-4">
            Lege dein erstes Projekt an und dokumentiere deine Arbeit.
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Erstes Projekt anlegen
          </button>
        </div>
      )}

      {projects && filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => setSelectedProjectId(project.id)}
              onDelete={() => deleteProjectCardMutation.mutate(project.id)}
            />
          ))}
        </div>
      )}

      <ProjectCreateDialog open={dialogOpen} onClose={() => setDialogOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
      />
    </div>
  );
}
