'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Plus, Loader2, AlertCircle, ShieldCheck, User,
  X, ToggleLeft, ToggleRight, Settings, ArrowLeft,
  Check, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';

interface LifeHubRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

interface LifeHubUser {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  roles: LifeHubRole[];
  createdAt: string;
}

interface Permission {
  id: string;
  domain: string;
  action: string;
}

export default function UsersPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentRoles = useAuthStore((s) => s.roles);
  const [hydrated, setHydrated] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<LifeHubUser | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  const isAdmin = currentRoles.includes('admin');

  if (!hydrated || !accessToken) {
    return (
      <div className="flex items-center justify-center py-20 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Authentifizierung läuft …
      </div>
    );
  }

  if (editingUser) {
    return <UserEditor user={editingUser} onBack={() => setEditingUser(null)} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Benutzer & Rollen</h1>
        <p className="text-sm text-fg-muted mt-1">Verwalte Benutzer, Rollen und Berechtigungen.</p>
      </div>
      <div className="flex gap-1 rounded-md border border-border bg-bg-surface p-1 w-fit">
        <button onClick={() => setActiveTab('users')}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-bg-raised text-fg' : 'text-fg-muted hover:text-fg'}`}>
          <User className="h-4 w-4 inline mr-1.5" /> Benutzer
        </button>
        <button onClick={() => setActiveTab('roles')}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'roles' ? 'bg-bg-raised text-fg' : 'text-fg-muted hover:text-fg'}`}>
          <ShieldCheck className="h-4 w-4 inline mr-1.5" /> Rollen & Berechtigungen
        </button>
      </div>
      {activeTab === 'users' && (
        <><UsersList onCreate={() => setShowCreate(true)} onEdit={setEditingUser} isAdmin={isAdmin} />
          {showCreate && <CreateUserDialog onClose={() => setShowCreate(false)} isAdmin={isAdmin} />}</>
      )}
      {activeTab === 'roles' && <RolesTab />}
    </div>
  );
}

// ========== USERS TAB ==========

function UsersList({ onCreate, onEdit, isAdmin }: { onCreate: () => void; onEdit: (u: LifeHubUser) => void; isAdmin: boolean }) {
  const { data: users, isLoading, error } = useQuery<LifeHubUser[]>({ queryKey: ['users'], queryFn: () => api.get<LifeHubUser[]>('/users') });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">{users?.length ?? 0} Benutzer</p>
        <button onClick={onCreate} className="flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 transition-colors"><Plus className="h-4 w-4" /> Benutzer anlegen</button>
      </div>
      {isLoading && <div className="flex items-center justify-center py-20 text-fg-muted"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Lade Benutzer …</div>}
      {error && !isLoading && <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger"><AlertCircle className="h-5 w-5 shrink-0 mt-0.5" /><div><p className="font-medium">Fehler beim Laden</p><p className="text-sm text-danger/80 mt-1">{(error as Error).message}</p></div></div>}
      {!isLoading && !error && (users?.length ?? 0) > 0 && <div className="space-y-2">{users!.map((u) => <UserRow key={u.id} user={u} onEdit={onEdit} isAdmin={isAdmin} />)}</div>}
      {!isLoading && !error && (users?.length ?? 0) === 0 && <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-fg-muted"><User className="h-10 w-10 mb-3 opacity-40" /><p className="font-medium">Noch keine Benutzer</p><p className="text-sm mt-1">Lege den ersten Benutzer an.</p></div>}
    </div>
  );
}

function UserRow({ user, onEdit, isAdmin }: { user: LifeHubUser; onEdit: (u: LifeHubUser) => void; isAdmin: boolean }) {
  const qc = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: () => user.isActive ? api.post(`/users/${user.id}/disable`) : api.post(`/users/${user.id}/enable`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-bg-surface p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10 text-brand-500 shrink-0">{user.roles?.some(r => r.name === 'admin') ? <ShieldCheck className="h-5 w-5" /> : <User className="h-5 w-5" />}</div>
      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user.displayName}</p><p className="text-xs text-fg-muted truncate">{user.email}</p></div>
      <div className="flex gap-1.5">{user.roles?.map((role) => (<span key={role.name} className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-500 border border-brand-500/20">{role.name}</span>))}</div>
      {isAdmin && <button onClick={() => toggleMutation.mutate()} disabled={toggleMutation.isPending} className={`${user.isActive ? 'text-green-500' : 'text-fg-subtle'} hover:opacity-80 transition-opacity`} title={user.isActive ? 'Deaktivieren' : 'Aktivieren'}>{toggleMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : user.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}</button>}
      {isAdmin && <button onClick={() => onEdit(user)} className="text-fg-muted hover:text-fg transition-colors" title="Bearbeiten"><Settings className="h-4 w-4" /></button>}
    </div>
  );
}

function UserEditor({ user, onBack }: { user: LifeHubUser; onBack: () => void }) {
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<string | null>(null);

  const { data: allRoles } = useQuery<LifeHubRole[]>({ queryKey: ['roles'], queryFn: () => api.get<LifeHubRole[]>('/roles') });
  const userRoleIds = new Set(user.roles.map(r => r.id));
  const availableRoles = (allRoles ?? []).filter(r => !userRoleIds.has(r.id));

  const assignMutation = useMutation({ mutationFn: (roleId: string) => api.post(`/users/${user.id}/roles/${roleId}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
  const removeMutation = useMutation({ mutationFn: (roleId: string) => api['delete'](`/users/${user.id}/roles/${roleId}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
  const updateMutation = useMutation({ mutationFn: (body: { displayName?: string; email?: string }) => api.put(`/users/${user.id}`, body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setError(null); }, onError: (err) => setError((err as Error).message) });
  const deleteMutation = useMutation({ mutationFn: () => api['delete'](`/users/${user.id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onBack(); }, onError: (err) => setError((err as Error).message) });

  function handleSave() {
    setError(null);
    const patch: { displayName?: string; email?: string } = {};
    if (displayName !== user.displayName) patch.displayName = displayName;
    if (email !== user.email) patch.email = email;
    if (Object.keys(patch).length > 0) updateMutation.mutate(patch);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Zurück zur Benutzerliste</button>
      <div className="rounded-lg border border-border bg-bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold">Benutzer bearbeiten</h2>
        <p className="text-sm text-fg-muted">{user.email} · {user.isActive ? 'Aktiv' : 'Inaktiv'}</p>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Anzeigename</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" /></div>
          <div><label className="block text-sm font-medium mb-1">E-Mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" /></div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button onClick={handleSave} disabled={updateMutation.isPending} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50">{updateMutation.isPending ? 'Speichert…' : 'Speichern'}</button>
        </div>
        <hr className="border-border" />
        <h3 className="text-sm font-medium">Aktuelle Rollen</h3>
        <div className="flex flex-wrap gap-2">
          {user.roles.map((role) => (
            <div key={role.id} className="flex items-center gap-1.5 rounded-full bg-brand-500/10 pl-3 pr-1.5 py-1 border border-brand-500/20">
              <span className="text-xs font-medium text-brand-500">{role.name}</span>
              <button onClick={() => removeMutation.mutate(role.id)} disabled={removeMutation.isPending} className="rounded-full p-0.5 text-brand-500/60 hover:text-brand-500 hover:bg-brand-500/20" title="Entziehen"><X className="h-3 w-3" /></button>
            </div>
          ))}
          {user.roles.length === 0 && <p className="text-xs text-fg-subtle">Keine Rollen</p>}
        </div>
        {availableRoles.length > 0 && (
          <div><h3 className="text-sm font-medium mb-2">Rolle hinzufügen</h3>
            <div className="flex flex-wrap gap-2">{availableRoles.map((role) => (
              <button key={role.id} onClick={() => assignMutation.mutate(role.id)} disabled={assignMutation.isPending} className="rounded-full bg-bg-raised px-3 py-1 text-xs font-medium text-fg-muted hover:text-fg hover:bg-brand-500/20 border border-border">+ {role.name}</button>
            ))}</div>
          </div>
        )}
        <hr className="border-border" />
        <div><h3 className="text-sm font-medium text-danger mb-2">Benutzer löschen</h3>
          <p className="text-xs text-fg-muted mb-2">Deaktiviert den Benutzer und blendet ihn aus der Liste aus.</p>
          <button onClick={() => { if (confirm('Benutzer wirklich löschen?')) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} className="rounded-md border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50">{deleteMutation.isPending ? 'Lösche…' : 'Benutzer löschen'}</button>
        </div>
      </div>
    </div>
  );
}

function CreateUserDialog({ onClose, isAdmin }: { onClose: () => void; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { data: allRoles } = useQuery<LifeHubRole[]>({ queryKey: ['roles'], queryFn: () => api.get<LifeHubRole[]>('/roles'), enabled: isAdmin });
  const mutation = useMutation({
    mutationFn: (body: { email: string; password: string; displayName: string; roleIds?: string[] }) => isAdmin ? api.post('/users/admin-create', body) : api.post('/auth/register', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    onError: (err) => setError((err as Error).message),
  });
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); setError(null); if (!email.trim() || !password.trim()) { setError('E-Mail und Passwort sind Pflicht.'); return; } mutation.mutate({ email: email.trim(), password, displayName: displayName.trim() || (email.split('@')[0] ?? ''), roleIds: selectedRoleIds.length > 0 ? selectedRoleIds : undefined }); }
  function toggleRole(roleId: string) { setSelectedRoleIds(prev => prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]); }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Benutzer anlegen</h2><button type="button" onClick={onClose} className="text-fg-muted hover:text-fg"><X className="h-5 w-5" /></button></div>
        <div><label className="block text-sm font-medium mb-1">Anzeigename</label><input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="z.B. Max Mustermann" className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50" /></div>
        <div><label className="block text-sm font-medium mb-1">E-Mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="max@example.com" required className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50" /></div>
        <div><label className="block text-sm font-medium mb-1">Passwort</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={8} required className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50" /></div>
        {isAdmin && allRoles && allRoles.length > 0 && (<div><label className="block text-sm font-medium mb-1.5">Rollen zuweisen</label><div className="flex flex-wrap gap-2">{allRoles.map((role) => (<button key={role.id} type="button" onClick={() => toggleRole(role.id)} className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${selectedRoleIds.includes(role.id) ? 'bg-brand-500 text-bg border-brand-500' : 'bg-bg-raised text-fg-muted hover:text-fg border-border'}`}>{role.name}</button>))}</div></div>)}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg">Abbrechen</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50 flex items-center justify-center gap-2">{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Anlegen</button>
        </div>
      </form>
    </div>
  );
}

// ========== ROLES TAB ==========

function RolesTab() {
  const currentRoles = useAuthStore((s) => s.roles);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  if (!currentRoles.includes('admin')) return <div className="flex items-center justify-center py-20 text-fg-muted"><AlertCircle className="h-5 w-5 mr-2" /> Nur Administratoren können Rollen verwalten.</div>;
  return <RolesList onExpand={setExpandedRole} expandedRole={expandedRole} />;
}

function RolesList({ onExpand, expandedRole }: { onExpand: (id: string | null) => void; expandedRole: string | null }) {
  const qc = useQueryClient();
  const { data: roles, isLoading, error } = useQuery<LifeHubRole[]>({ queryKey: ['roles'], queryFn: () => api.get<LifeHubRole[]>('/roles') });
  const { data: allPerms } = useQuery<Permission[]>({ queryKey: ['permissions'], queryFn: () => api.get<Permission[]>('/permissions') });
  const deleteMutation = useMutation({ mutationFn: (id: string) => api['delete'](`/roles/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); } });
  if (isLoading) return <div className="flex items-center justify-center py-20 text-fg-muted"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Lade Rollen …</div>;
  if (error) return <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger flex items-start gap-3"><AlertCircle className="h-5 w-5 shrink-0 mt-0.5" /><p className="text-sm">Fehler beim Laden: {(error as Error).message}</p></div>;
  const permsByDomain: Record<string, Permission[]> = {};
  if (allPerms) for (const p of allPerms) (permsByDomain[p.domain] ??= []).push(p);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><p className="text-sm text-fg-muted">{roles?.length ?? 0} Rollen</p><button onClick={() => onExpand('__create__')} className="flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400"><Plus className="h-4 w-4" /> Rolle erstellen</button></div>
      {expandedRole === '__create__' && <InlineCreateRole onClose={() => onExpand(null)} />}
      {(roles?.length ?? 0) === 0 && <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-fg-muted"><ShieldCheck className="h-10 w-10 mb-3 opacity-40" /><p className="font-medium">Noch keine Rollen</p></div>}
      {roles?.map((role) => (
        <div key={role.id} className="rounded-lg border border-border bg-bg-surface overflow-hidden">
          <button onClick={() => onExpand(expandedRole === role.id ? null : role.id)} className="flex w-full items-center gap-4 p-4 text-left hover:bg-bg/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10 text-brand-500 shrink-0"><ShieldCheck className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-medium">{role.name}</p>{role.isSystem && <span className="rounded bg-bg-raised px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle">System</span>}</div>{role.description && <p className="text-xs text-fg-muted truncate mt-0.5">{role.description}</p>}</div>
            {!role.isSystem && <button onClick={(e) => { e.stopPropagation(); if (confirm('Rolle wirklich löschen?')) deleteMutation.mutate(role.id); }} disabled={deleteMutation.isPending} className="rounded-md p-1.5 text-fg-subtle hover:text-danger hover:bg-danger/10" title="Löschen"><Trash2 className="h-4 w-4" /></button>}
            {expandedRole === role.id ? <ChevronUp className="h-4 w-4 text-fg-muted" /> : <ChevronDown className="h-4 w-4 text-fg-muted" />}
          </button>
          {expandedRole === role.id && <RolePermissionsPanel roleId={role.id} permsByDomain={permsByDomain} />}
        </div>
      ))}
    </div>
  );
}

function RolePermissionsPanel({ roleId, permsByDomain }: { roleId: string; permsByDomain: Record<string, Permission[]> }) {
  const qc = useQueryClient();
  const { data: rolePerms } = useQuery<Permission[]>({ queryKey: ['role-permissions', roleId], queryFn: () => api.get<Permission[]>(`/roles/${roleId}/permissions`) });
  const rolePermIds = new Set((rolePerms ?? []).map(p => p.id));
  const assignMutation = useMutation({ mutationFn: (permissionIds: string[]) => api.put(`/roles/${roleId}/permissions`, { permissionIds }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['role-permissions', roleId] }); qc.invalidateQueries({ queryKey: ['roles'] }); } });
  const domains = Object.keys(permsByDomain).sort();
  function togglePermission(permId: string) { const current = rolePermIds.has(permId) ? (rolePerms ?? []).filter(p => p.id !== permId).map(p => p.id) : [...(rolePerms ?? []).map(p => p.id), permId]; assignMutation.mutate(current); }
  return (
    <div className="border-t border-border p-4 space-y-1">
      <p className="text-xs font-medium text-fg-muted mb-2 uppercase tracking-wider">Berechtigungen</p>
      {assignMutation.isPending && <p className="text-xs text-fg-muted mb-2">Wird gespeichert…</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
        {domains.map((domain) => (
          <div key={domain} className="space-y-0.5">
            <p className="text-[11px] font-medium text-brand-500 capitalize">{domain}</p>
            {(permsByDomain[domain] ?? []).map((perm) => (
              <button key={perm.id} onClick={() => togglePermission(perm.id)} disabled={assignMutation.isPending}
                className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs transition-colors w-full text-left ${rolePermIds.has(perm.id) ? 'text-brand-500 bg-brand-500/10' : 'text-fg-subtle hover:text-fg hover:bg-bg'}`}>
                {rolePermIds.has(perm.id) ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-3 w-3 shrink-0" />}{perm.action}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function InlineCreateRole({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(''); const [description, setDescription] = useState('');
  const mutation = useMutation({ mutationFn: (body: { name: string; description?: string }) => api.post('/roles', body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); onClose(); } });
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (!name.trim()) return; mutation.mutate({ name: name.trim(), description: description.trim() || undefined }); }
  return (
    <div className="rounded-lg border border-brand-500/30 bg-bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between"><h3 className="text-sm font-medium">Neue Rolle</h3><button onClick={onClose} className="text-fg-muted hover:text-fg"><X className="h-4 w-4" /></button></div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><label className="block text-xs font-medium mb-1">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. editor" required className="w-full rounded-md border border-border-strong bg-bg px-3 py-1.5 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50" /></div>
        <div><label className="block text-xs font-medium mb-1">Beschreibung</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="w-full rounded-md border border-border-strong bg-bg px-3 py-1.5 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50" /></div>
        {mutation.isError && <p className="text-xs text-danger">Fehler: {(mutation.error as Error).message}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg">Abbrechen</button>
          <button type="submit" disabled={mutation.isPending} className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-bg hover:bg-brand-400 disabled:opacity-50">{mutation.isPending ? 'Wird erstellt…' : 'Erstellen'}</button>
        </div>
      </form>
    </div>
  );
}
