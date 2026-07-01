'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Plus, Server, Monitor, Router, Wifi, Printer, Smartphone, Tablet,
  Cpu, HardDrive, Network, Laptop, Loader2, Trash2, Pencil,
  ChevronLeft, Search,
} from 'lucide-react';

type DeviceType = 'server' | 'nas' | 'router' | 'switch' | 'raspi' | 'printer' | 'pc' | 'laptop' | 'tablet' | 'phone' | 'other';

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  ipAddress: string | null;
  macAddress: string | null;
  hostname: string | null;
  os: string | null;
  location: string | null;
  notes: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

const deviceTypeMeta: Record<DeviceType, { label: string; icon: typeof Server; color: string }> = {
  server: { label: 'Server', icon: Server, color: 'text-blue-500' },
  nas: { label: 'NAS', icon: HardDrive, color: 'text-cyan-500' },
  router: { label: 'Router', icon: Router, color: 'text-orange-500' },
  switch: { label: 'Switch', icon: Network, color: 'text-purple-500' },
  raspi: { label: 'Raspberry Pi', icon: Cpu, color: 'text-green-500' },
  printer: { label: 'Drucker', icon: Printer, color: 'text-red-500' },
  pc: { label: 'PC', icon: Monitor, color: 'text-zinc-500' },
  laptop: { label: 'Laptop', icon: Laptop, color: 'text-indigo-500' },
  tablet: { label: 'Tablet', icon: Tablet, color: 'text-pink-500' },
  phone: { label: 'Smartphone', icon: Smartphone, color: 'text-yellow-500' },
  other: { label: 'Sonstiges', icon: Wifi, color: 'text-gray-400' },
};

/* ─── Device Dialog ─── */
function DeviceDialog({ open, device, onClose, onSuccess }: {
  open: boolean; device: Device | null; onClose: () => void; onSuccess: () => void;
}) {
  const isEdit = !!device;
  const [name, setName] = useState(device?.name ?? '');
  const [type, setType] = useState<DeviceType>(device?.type ?? 'other');
  const [ipAddress, setIpAddress] = useState(device?.ipAddress ?? '');
  const [macAddress, setMacAddress] = useState(device?.macAddress ?? '');
  const [hostname, setHostname] = useState(device?.hostname ?? '');
  const [os, setOs] = useState(device?.os ?? '');
  const [location, setLocation] = useState(device?.location ?? '');
  const [notes, setNotes] = useState(device?.notes ?? '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const body = { name, type, ipAddress: ipAddress || undefined, macAddress: macAddress || undefined, hostname: hostname || undefined, os: os || undefined, location: location || undefined, notes: notes || undefined };
      return isEdit
        ? api.put<Device>(`/it/devices/${device.id}`, body)
        : api.post<Device>('/it/devices', body);
    },
    onSuccess: () => {
      setName(''); setType('other'); setIpAddress(''); setMacAddress(''); setHostname(''); setOs(''); setLocation(''); setNotes(''); setError('');
      onSuccess(); onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{isEdit ? 'Gerät bearbeiten' : 'Gerät hinzufügen'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Name *</label>
            <input className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="z.B. Heimserver" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Typ</label>
            <select className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500" value={type} onChange={(e) => setType(e.target.value as DeviceType)}>
              {Object.entries(deviceTypeMeta).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">IP-Adresse</label>
              <input className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="192.168.1.1" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">MAC-Adresse</label>
              <input className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="AA:BB:CC:DD:EE:FF" value={macAddress} onChange={(e) => setMacAddress(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Hostname</label>
              <input className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="heimserver" value={hostname} onChange={(e) => setHostname(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Betriebssystem</label>
              <input className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Debian 12" value={os} onChange={(e) => setOs(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Standort</label>
            <input className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Keller, Serverrack" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Notizen</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px]" placeholder="..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={() => mutation.mutate()}
            disabled={!name || mutation.isPending}
            className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Speichern' : 'Gerät hinzufügen'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Device Card ─── */
function DeviceCard({ device, onEdit, onDelete }: {
  device: Device; onEdit: () => void; onDelete: () => void;
}) {
  const meta = deviceTypeMeta[device.type] ?? deviceTypeMeta.other;
  const Icon = meta.icon;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md transition-all p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`shrink-0 mt-0.5 ${meta.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{device.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium inline-block mt-1">
              {meta.label}
            </span>
            {device.location && (
              <p className="text-xs text-zinc-400 mt-1">{device.location}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-amber-500 transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {(device.ipAddress || device.hostname || device.os) && (
        <div className="mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          {device.ipAddress && <p className="flex items-center gap-1"><Network className="h-3 w-3" /> {device.ipAddress}</p>}
          {device.hostname && <p className="flex items-center gap-1"><Monitor className="h-3 w-3" /> {device.hostname}</p>}
          {device.os && <p className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {device.os}</p>}
          {device.macAddress && <p className="font-mono text-[10px] text-zinc-400">{device.macAddress}</p>}
        </div>
      )}
      {device.notes && (
        <p className="mt-2 text-xs text-zinc-400 line-clamp-2">{device.notes}</p>
      )}
    </div>
  );
}

/* ─── Network View ─── */
function NetworkView({ devices, onEdit, onDelete }: {
  devices: Device[]; onEdit: (d: Device) => void; onDelete: (d: Device) => void;
}) {
  const networkDevices = devices.filter(d => d.ipAddress);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Network className="h-4 w-4 text-amber-500" />
          Netzwerk-Übersicht ({networkDevices.length} Geräte mit IP)
        </h3>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {networkDevices.length === 0 ? (
          <p className="p-6 text-sm text-zinc-400 text-center">Keine Geräte mit IP-Adresse.</p>
        ) : (
          networkDevices.map((device) => {
            const meta = deviceTypeMeta[device.type] ?? deviceTypeMeta.other;
            const Icon = meta.icon;
            return (
              <div key={device.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                <Icon className={`h-4 w-4 ${meta.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{device.name}</p>
                  <p className="text-xs text-zinc-400 truncate">{device.hostname || device.macAddress || '-'}</p>
                </div>
                <p className="text-sm font-mono text-zinc-500">{device.ipAddress}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(device)} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-amber-500">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button onClick={() => onDelete(device)} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ItInventoryPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [showCreate, setShowCreate] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [view, setView] = useState<'grid' | 'network'>('grid');
  const [search, setSearch] = useState('');

  useEffect(() => { if (!accessToken) router.push('/login'); }, [accessToken, router]);

  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ['it-devices'],
    queryFn: () => api.get<Device[]>('/it/devices'),
    enabled: !!accessToken,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/it/devices/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-devices'] }),
  });

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const filtered = devices?.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.ipAddress?.toLowerCase().includes(search.toLowerCase()) ||
    d.hostname?.toLowerCase().includes(search.toLowerCase()) ||
    d.location?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const counts = (devices ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Haus-IT</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {devices?.length ?? 0} Geräte im Inventar
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Gerät hinzufügen
        </button>
      </div>

      {/* Search + View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Suchen..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'grid' ? 'bg-amber-600 text-white' : 'bg-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
          >
            Übersicht
          </button>
          <button
            onClick={() => setView('network')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'network' ? 'bg-amber-600 text-white' : 'bg-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
          >
            Netzwerk
          </button>
        </div>
      </div>

      {/* Type Summary */}
      {view === 'grid' && Object.keys(counts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts).map(([type, count]) => {
            const meta = deviceTypeMeta[type as DeviceType] ?? deviceTypeMeta.other;
            const Icon = meta.icon;
            return (
              <div key={type} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs">
                <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                <span>{meta.label}</span>
                <span className="text-zinc-400 ml-0.5">({count})</span>
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <Server className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Keine Geräte gefunden</p>
          <p className="text-sm mt-1">{search ? 'Keine Ergebnisse für deine Suche.' : 'Füge dein erstes Gerät hinzu.'}</p>
          {!search && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Gerät hinzufügen
            </button>
          )}
        </div>
      ) : view === 'network' ? (
        <NetworkView
          devices={filtered}
          onEdit={(d) => setEditingDevice(d)}
          onDelete={(d) => { if (window.confirm(`"${d.name}" löschen?`)) deleteMutation.mutate(d.id); }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onEdit={() => setEditingDevice(device)}
              onDelete={() => { if (window.confirm(`"${device.name}" löschen?`)) deleteMutation.mutate(device.id); }}
            />
          ))}
        </div>
      )}

      <DeviceDialog
        open={showCreate}
        device={null}
        onClose={() => setShowCreate(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['it-devices'] })}
      />

      {editingDevice && (
        <DeviceDialog
          open={true}
          device={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['it-devices'] })}
        />
      )}
    </div>
  );
}
