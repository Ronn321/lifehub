'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Loader2, Plus, Shield, Heart, Car, Home, Users,
  Scale, FileText, Trash2, ArrowLeft, Calendar, Phone,
  Mail, Building2, Hash, AlertTriangle, FilePlus,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface InsurancePolicy {
  id: string;
  name: string;
  category: string;
  provider: string;
  policyNumber: string | null;
  premium: string | null;
  interval: string;
  startDate: string | null;
  endDate: string | null;
  cancellationPeriodDays: number | null;
  endsAt: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
}

interface InsuranceDocument {
  id: string;
  policyId: string;
  name: string;
  documentId: string | null;
  createdAt: string;
}

interface InsurancePolicyWithDocuments extends InsurancePolicy {
  documents: InsuranceDocument[];
}

const categoryLabels: Record<string, string> = {
  health: 'Krankenversicherung', liability: 'Haftpflicht', car: 'Kfz-Versicherung',
  home: 'Hausrat/Wohngebäude', life: 'Lebensversicherung', legal: 'Rechtsschutz', other: 'Sonstige',
};

const categoryIcons: Record<string, React.ReactNode> = {
  health: <Heart className="h-5 w-5" />,
  liability: <Scale className="h-5 w-5" />,
  car: <Car className="h-5 w-5" />,
  home: <Home className="h-5 w-5" />,
  life: <Users className="h-5 w-5" />,
  legal: <Shield className="h-5 w-5" />,
  other: <FileText className="h-5 w-5" />,
};

const intervalLabels: Record<string, string> = {
  monthly: 'mtl.', quarterly: 'vierteljährl.', yearly: 'jährl.',
};

function formatEuro(amount: string) {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
}

function formatDate(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('de-DE');
}

function getMonthlyPremium(policy: InsurancePolicy): number {
  const p = parseFloat(policy.premium ?? '0');
  if (isNaN(p)) return 0;
  if (policy.interval === 'quarterly') return p / 3;
  if (policy.interval === 'yearly') return p / 12;
  return p;
}

export default function InsurancePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  useEffect(() => { if (!accessToken) router.push('/login'); }, [accessToken, router]);

  const { data: policies, isLoading } = useQuery<InsurancePolicy[]>({
    queryKey: ['insurance', 'policies'],
    queryFn: () => api.get<InsurancePolicy[]>('/insurance/policies'),
    enabled: !!accessToken,
  });

  const { data: detail } = useQuery<InsurancePolicyWithDocuments>({
    queryKey: ['insurance', 'policy', selectedId],
    queryFn: () => api.get<InsurancePolicyWithDocuments>(`/insurance/policies/${selectedId}`),
    enabled: !!accessToken && !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/insurance/policies', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurance', 'policies'] }); setShowCreate(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/insurance/policies/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurance', 'policies'] }); setSelectedId(null); },
  });

  const docMutation = useMutation({
    mutationFn: ({ policyId, ...body }: { policyId: string; name: string }) =>
      api.post(`/insurance/policies/${policyId}/documents`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', 'policy', selectedId] }),
  });

  if (!accessToken) {
    return <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
    </div>;
  }

  if (selectedId && detail) {
    return <DetailView
      policy={detail}
      onBack={() => setSelectedId(null)}
      onDelete={(id) => { deleteMutation.mutate(id); }}
      onAddDoc={(name) => docMutation.mutate({ policyId: detail.id, name })}
      isDeleting={deleteMutation.isPending}
    />;
  }

  const totalMonthly = (policies ?? []).reduce((sum, p) => sum + getMonthlyPremium(p), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Versicherungen</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> Neu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-bg-surface p-5">
          <p className="text-sm text-fg-muted mb-1">Versicherungen</p>
          <p className="text-2xl font-bold">{policies?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-5">
          <p className="text-sm text-fg-muted mb-1">Monatsbeitrag gesamt</p>
          <p className="text-2xl font-bold text-brand-500">{formatEuro(totalMonthly.toFixed(2))}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-5">
          <p className="text-sm text-fg-muted mb-1">Jahresbeitrag gesamt</p>
          <p className="text-2xl font-bold">{formatEuro((totalMonthly * 12).toFixed(2))}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(policies ?? []).map((p) => (
            <button key={p.id} onClick={() => setSelectedId(p.id)}
              className="text-left rounded-lg border border-border bg-bg-surface p-4 hover:border-brand-500/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-full bg-brand-500/10 text-brand-500 shrink-0">
                  {categoryIcons[p.category] ?? <Shield className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs text-fg-muted flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3" /> {p.provider}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-fg-muted">{categoryLabels[p.category] ?? p.category}</span>
                  <span className="font-semibold">
                    {p.premium ? `${formatEuro(p.premium)}/${intervalLabels[p.interval] ?? p.interval}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-fg-muted">
                  <span>Monatlich: <strong>{formatEuro(getMonthlyPremium(p).toFixed(2))}</strong></span>
                  {p.cancellationPeriodDays && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {p.cancellationPeriodDays} Tage
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {(!policies || policies.length === 0) && (
            <div className="col-span-full text-center py-12 text-fg-muted">
              <Shield className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Keine Versicherungen erfasst</p>
              <button onClick={() => setShowCreate(true)}
                className="mt-3 text-sm text-brand-500 hover:underline"
              >Jetzt erste Versicherung anlegen</button>
            </div>
          )}
        </div>
      )}

      {showCreate && <CreateDialog
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />}
    </div>
  );
}

function DetailView({ policy, onBack, onDelete, onAddDoc, isDeleting }: {
  policy: InsurancePolicyWithDocuments;
  onBack: () => void;
  onDelete: (id: string) => void;
  onAddDoc: (name: string) => void;
  isDeleting: boolean;
}) {
  const [docName, setDocName] = useState('');
  const monthly = getMonthlyPremium(policy);

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors"
      ><ArrowLeft className="h-4 w-4" /> Zurück</button>

      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-brand-500/10 text-brand-500">
            {categoryIcons[policy.category] ?? <Shield className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{policy.name}</h2>
            <p className="text-sm text-fg-muted mt-1">{categoryLabels[policy.category] ?? policy.category}</p>
          </div>
          <button onClick={() => onDelete(policy.id)} disabled={isDeleting}
            className="p-2 rounded-md text-fg-muted hover:text-danger hover:bg-danger/10 transition-colors"
          ><Trash2 className="h-4 w-4" /></button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <InfoRow icon={<Building2 className="h-4 w-4" />} label="Anbieter" value={policy.provider} />
          <InfoRow icon={<Hash className="h-4 w-4" />} label="Versicherungsnummer" value={policy.policyNumber ?? '-'} />
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Beginn" value={formatDate(policy.startDate)} />
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Ende" value={formatDate(policy.endDate)} />

          <div className="col-span-2 rounded-lg bg-bg p-3">
            <p className="text-xs text-fg-muted mb-1">Beitrag</p>
            <p className="text-lg font-bold text-brand-500">
              {policy.premium ? `${formatEuro(policy.premium)} / ${intervalLabels[policy.interval] ?? policy.interval}` : '-'}
            </p>
            <p className="text-xs text-fg-muted mt-1">Monatlich: {formatEuro(monthly.toFixed(2))} | Jährlich: {formatEuro((monthly * 12).toFixed(2))}</p>
          </div>

          {policy.cancellationPeriodDays && (
            <div className="col-span-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Kündigungsfrist</p>
                <p className="text-xs text-fg-muted">
                  {policy.cancellationPeriodDays} Tage
                  {policy.endsAt ? ` — frühestens kündbar zum ${formatDate(policy.endsAt)}` : ''}
                </p>
              </div>
            </div>
          )}

          {policy.contactName && (
            <InfoRow icon={<Users className="h-4 w-4" />} label="Ansprechpartner" value={policy.contactName} />
          )}
          {policy.contactPhone && (
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefon" value={policy.contactPhone} />
          )}
          {policy.contactEmail && (
            <InfoRow icon={<Mail className="h-4 w-4" />} label="E-Mail" value={policy.contactEmail} />
          )}
          {policy.notes && (
            <div className="col-span-2">
              <p className="text-xs text-fg-muted mb-1">Notizen</p>
              <p className="text-sm whitespace-pre-wrap">{policy.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <h3 className="text-lg font-semibold mb-4">Dokumente</h3>
        <div className="space-y-2">
          {policy.documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-md border border-border p-3">
              <FileText className="h-4 w-4 text-fg-muted" />
              <span className="text-sm flex-1">{doc.name}</span>
              <span className="text-xs text-fg-muted">{formatDate(doc.createdAt)}</span>
            </div>
          ))}
          {policy.documents.length === 0 && (
            <p className="text-sm text-fg-muted">Keine Dokumente hinterlegt</p>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <input type="text" value={docName} onChange={(e) => setDocName(e.target.value)}
            placeholder="Dokumentname..."
            className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button onClick={() => { if (docName.trim()) { onAddDoc(docName.trim()); setDocName(''); } }}
            className="flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          ><FilePlus className="h-4 w-4" /> Hinzufügen</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-fg-muted">{icon}</span>
      <div>
        <p className="text-xs text-fg-muted">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function CreateDialog({ onClose, onSubmit, isPending }: {
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: '', category: 'liability', provider: '', policyNumber: '',
    premium: '', interval: 'monthly', startDate: '',
    cancellationPeriodDays: '', endsAt: '',
    contactName: '', contactPhone: '', contactEmail: '', notes: '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="rounded-lg border border-border bg-bg-surface p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Neue Versicherung</h2>
        <div className="space-y-3">
          <input name="name" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />

          <div className="grid grid-cols-2 gap-3">
            <select name="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select name="interval" value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="monthly">Monatlich</option>
              <option value="quarterly">Vierteljährlich</option>
              <option value="yearly">Jährlich</option>
            </select>
          </div>

          <input name="provider" placeholder="Anbieter *" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />

          <div className="grid grid-cols-2 gap-3">
            <input name="policyNumber" placeholder="Versicherungsnummer" value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input name="premium" placeholder="Beitrag (z.B. 89,90)" value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value })}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input name="startDate" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input name="cancellationPeriodDays" type="number" placeholder="Kündigungsfrist (Tage)" value={form.cancellationPeriodDays} onChange={(e) => setForm({ ...form, cancellationPeriodDays: e.target.value })}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <input name="endsAt" type="date" placeholder="Nächstmögliches Kündigungsdatum" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />

          <details className="text-sm">
            <summary className="cursor-pointer text-fg-muted hover:text-fg">Kontakt (optional)</summary>
            <div className="mt-2 space-y-3">
              <input name="contactName" placeholder="Ansprechpartner" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <div className="grid grid-cols-2 gap-3">
                <input name="contactPhone" placeholder="Telefon" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <input name="contactEmail" type="email" placeholder="E-Mail" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
          </details>

          <textarea name="notes" placeholder="Notizen" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-bg transition-colors"
          >Abbrechen</button>
          <button onClick={() => {
            const data: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(form)) {
              if (v !== '') data[k] = v;
            }
            if (data.name && data.provider) onSubmit(data);
          }} disabled={isPending || !form.name || !form.provider}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >{isPending ? 'Wird angelegt...' : 'Anlegen'}</button>
        </div>
      </div>
    </div>
  );
}
