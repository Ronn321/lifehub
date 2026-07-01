'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Plus, MapPin, Calendar, Image, Trash2, MoreHorizontal,
  ChevronLeft, Globe, Loader2,
} from 'lucide-react';

interface TravelTrip {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  coverMediaId: string | null;
  status: 'planned' | 'active' | 'completed';
  destinationCount: number;
  dayCount: number;
  mediaCount: number;
  destinations: TravelDestination[];
  createdAt: string;
}

interface TravelDestination {
  id: string;
  tripId: string;
  name: string;
  lat: string;
  lng: string;
  arrivalAt: string | null;
  departureAt: string | null;
  notes: string | null;
  ord: number;
}

interface TravelTripDay {
  id: string;
  tripId: string;
  dayDate: string;
  title: string | null;
  notes: string | null;
}

interface TravelTripMediaRef {
  tripId: string;
  mediaId: string;
  dayId: string | null;
  ord: number;
}

interface TripDetail extends TravelTrip {
  days: TravelTripDay[];
  mediaRefs: TravelTripMediaRef[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function diffDays(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Geplant', active: 'Aktiv', completed: 'Abgeschlossen',
};

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

/* ─── Trip Dialog (Create) ─── */
function TripDialog({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<TravelTrip>('/travel/trips', { title, description, startDate, endDate }),
    onSuccess: () => {
      setTitle(''); setDescription(''); setStartDate(''); setEndDate(''); setError('');
      onSuccess(); onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Neue Reise</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Titel</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="z.B. Italien 2025"
              value={title} onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Beschreibung (optional)</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px] resize-y"
              placeholder="Deine Reisebeschreibung..."
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Startdatum</label>
              <input type="date"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={startDate} onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Enddatum</label>
              <input type="date"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={endDate} onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={() => mutation.mutate()}
            disabled={!title || !startDate || !endDate || mutation.isPending}
            className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Reise anlegen
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Trip Card ─── */
function TripCard({ trip, onClick, onDelete }: {
  trip: TravelTrip; onClick: () => void; onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md transition-all cursor-pointer overflow-hidden relative group"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate pr-2">{trip.title}</h3>
            {trip.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{trip.description}</p>
            )}
          </div>
          <div className="relative shrink-0">
            <button
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg py-1 min-w-[120px]">
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
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {trip.destinationCount} Orte
          </span>
          <span className="flex items-center gap-1">
            <Image className="h-3.5 w-3.5" />
            {trip.mediaCount} Medien
          </span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[trip.status]}`}>
            {STATUS_LABELS[trip.status]}
          </span>
          <span className="text-xs text-zinc-400">
            {diffDays(trip.startDate, trip.endDate)} Tage
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Trip Detail View ─── */
function TripDetailView({ tripId, onBack }: { tripId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'destinations' | 'days' | 'map'>('overview');
  const [newDestName, setNewDestName] = useState('');
  const [newDestLat, setNewDestLat] = useState('');
  const [newDestLon, setNewDestLon] = useState('');
  const [newDayDate, setNewDayDate] = useState('');
  const [newDayTitle, setNewDayTitle] = useState('');
  const [detailError, setDetailError] = useState('');

  const { data: trip, isLoading, error } = useQuery<TripDetail>({
    queryKey: ['trip', tripId],
    queryFn: () => api.get<TripDetail>(`/travel/trips/${tripId}`),
  });

  const addDestMutation = useMutation({
    mutationFn: () => api.post(`/travel/trips/${tripId}/destinations`, {
      name: newDestName, lat: newDestLat, lng: newDestLon,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      setNewDestName(''); setNewDestLat(''); setNewDestLon(''); setDetailError('');
    },
    onError: (err) => setDetailError(err instanceof Error ? err.message : 'Fehler'),
  });

  const addDayMutation = useMutation({
    mutationFn: () => api.post(`/travel/trips/${tripId}/days`, {
      dayDate: newDayDate, title: newDayTitle || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      setNewDayDate(''); setNewDayTitle(''); setDetailError('');
    },
    onError: (err) => setDetailError(err instanceof Error ? err.message : 'Fehler'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/travel/trips/${tripId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      onBack();
    },
    onError: (err) => setDetailError(err instanceof Error ? err.message : 'Fehler'),
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

  if (error || !trip) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Reise nicht gefunden.</p>
        <button onClick={onBack} className="mt-2 text-sm text-amber-600 hover:underline">
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-2 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Zurück
          </button>
          <h2 className="text-2xl font-bold">{trip.title}</h2>
          {trip.description && (
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">{trip.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[trip.status]}`}>
              {STATUS_LABELS[trip.status]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={trip.status}
            onChange={(e) => {
              api.put(`/travel/trips/${tripId}`, { status: e.target.value }).then(() =>
                queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
              );
            }}
            className="text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 bg-transparent"
          >
            <option value="planned">Geplant</option>
            <option value="active">Aktiv</option>
            <option value="completed">Abgeschlossen</option>
          </select>
          <button
            onClick={() => { if (window.confirm('Wirklich löschen?')) deleteMutation.mutate(); }}
            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {(['overview', 'destinations', 'days', 'map'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {t === 'overview' ? 'Übersicht' :
             t === 'destinations' ? 'Orte' :
             t === 'days' ? 'Tage' : 'Karte'}
          </button>
        ))}
      </div>

      {detailError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          {detailError}
        </div>
      )}

      {tab === 'overview' && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Orte', value: trip.destinations.length, icon: MapPin },
            { label: 'Tage', value: trip.days.length, icon: Calendar },
            { label: 'Medien', value: trip.mediaRefs.length, icon: Image },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <span className="flex items-center gap-1 text-sm text-zinc-500 mb-2">
                <stat.icon className="h-4 w-4" /> {stat.label}
              </span>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'destinations' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input placeholder="Ort"
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={newDestName} onChange={(e) => setNewDestName(e.target.value)}
            />
            <input placeholder="Breite"
              className="w-24 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={newDestLat} onChange={(e) => setNewDestLat(e.target.value)}
            />
            <input placeholder="Länge"
              className="w-24 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={newDestLon} onChange={(e) => setNewDestLon(e.target.value)}
            />
            <button
              onClick={() => addDestMutation.mutate()}
              disabled={!newDestName || !newDestLat || !newDestLon}
              className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {trip.destinations.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">Noch keine Orte hinzugefügt.</p>
          )}
          {trip.destinations.map((dest, i) => (
            <div key={dest.id} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-bold shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{dest.name}</p>
                <p className="text-sm text-zinc-500">{parseFloat(dest.lat).toFixed(4)}, {parseFloat(dest.lng).toFixed(4)}</p>
              </div>
              <a href={`https://www.google.com/maps?q=${dest.lat},${dest.lng}`} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <MapPin className="h-4 w-4 text-zinc-500" />
              </a>
            </div>
          ))}
        </div>
      )}

      {tab === 'days' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="date"
              className="w-40 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={newDayDate} onChange={(e) => setNewDayDate(e.target.value)}
            />
            <input placeholder="Titel (optional)"
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={newDayTitle} onChange={(e) => setNewDayTitle(e.target.value)}
            />
            <button
              onClick={() => addDayMutation.mutate()}
              disabled={!newDayDate}
              className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {trip.days.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">Noch keine Tage hinzugefügt.</p>
          )}
          {trip.days.map((day) => (
            <div key={day.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <span className="font-medium">{formatDate(day.dayDate)}</span>
                {day.title && <span className="text-zinc-500">– {day.title}</span>}
              </div>
              {day.notes && <p className="text-sm text-zinc-500 mt-2 whitespace-pre-wrap">{day.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'map' && (
        <div className="space-y-4">
          {trip.destinations.length > 0 ? (
            <>
              <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    Math.min(...trip.destinations.map(d => parseFloat(d.lng))) - 1
                  },${
                    Math.min(...trip.destinations.map(d => parseFloat(d.lat))) - 0.5
                  },${
                    Math.max(...trip.destinations.map(d => parseFloat(d.lng))) + 1
                  },${
                    Math.max(...trip.destinations.map(d => parseFloat(d.lat))) + 0.5
                  }&layer=mapnik` +
                  trip.destinations.map(d => `&marker=${d.lat},${d.lng}`).join('')
                  }
                  width="100%" height="500"
                  className="border-0"
                  title="Reisekarte"
                  loading="lazy"
                  allowFullScreen
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {trip.destinations.map((dest) => (
                  <a key={dest.id}
                    href={`https://www.google.com/maps?q=${dest.lat},${dest.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-amber-600 hover:underline"
                  >
                    <MapPin className="h-3 w-3" /> {dest.name}
                  </a>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500 text-center py-8">
              Füge Orte hinzu, um die Karte zu sehen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TravelPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [search, setSearch] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: trips, isLoading, error } = useQuery<TravelTrip[]>({
    queryKey: ['trips'],
    queryFn: () => api.get<TravelTrip[]>('/travel/trips'),
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (!accessToken) router.push('/login');
  }, [accessToken, router]);

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (selectedTripId) {
    return <TripDetailView tripId={selectedTripId} onBack={() => setSelectedTripId(null)} />;
  }

  const filteredTrips = trips?.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reisen</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Alle deine Urlaube und Reisen an einem Ort
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Neue Reise
        </button>
      </div>

      <div className="relative">
        <input
          placeholder="Reise suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 pl-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 animate-pulse">
              <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
              <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
              <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-500">Fehler beim Laden der Reisen.</p>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['trips'] })} className="mt-2 text-sm text-amber-600 hover:underline">
            Erneut versuchen
          </button>
        </div>
      )}

      {trips && filteredTrips?.length === 0 && (
        <div className="text-center py-16">
          <Globe className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium mb-2">Noch keine Reisen</h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            Lege deine erste Reise an und halte Erinnerungen fest.
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Erste Reise anlegen
          </button>
        </div>
      )}

      {trips && filteredTrips && filteredTrips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onClick={() => setSelectedTripId(trip.id)}
              onDelete={async () => {
                await api.delete(`/travel/trips/${trip.id}`);
                queryClient.invalidateQueries({ queryKey: ['trips'] });
              }}
            />
          ))}
        </div>
      )}

      <TripDialog open={dialogOpen} onClose={() => setDialogOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['trips'] })}
      />
    </div>
  );
}
