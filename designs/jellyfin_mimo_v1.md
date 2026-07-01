# Jellyfin Redesign — Design-Konzept v1

Datum: 2026-06-18
Status: Entwurf
Basiert auf: Bestehende `page.tsx` (667 Zeilen), `UI_UX.md`, `jellyfin.feature.md`

---

## 1. Ausgangslage

Die aktuelle Seite `apps/frontend/src/app/(dashboard)/jellyfin/page.tsx` zeigt:

- **Server-Liste** als flache Cards mit Sync/Delete-Buttons
- **Bibliotheken** als 3-Spalten-Grid mit Film-Icon (alle gleich)
- **Items** als Listen-Ansicht (Text + Icons), kein Poster, kein Grid
- **MediaPlayer** als Overlays (Video/Audio/Photo) — funktioniert, bleibt erhalten

Fehlend: visuelle Attraktivität, Poster-Thumbnails, Hover-Effekte, Watched-Status-Badges, Synchronisations-Info.

---

## 2. Zielbild

Netflix-/Plex-/Jellyfin-ähnliche Oberfläche mit Kachel-Rastern, Posterbildern, fließenden Übergängen und klarem Hierarchie-Wechsel zwischen Server → Bibliothek → Items.

---

## 3. Komponenten-Architektur

```
JellyfinPage
├── JellyfinHeader              ← Server-Status, Sync-Button, Breadcrumb
├── ServerConnectCard           ← nur wenn kein Server verbunden (Empty-State)
├── LibraryGrid                 ← Kachel-Raster der Bibliotheken
│   └── LibraryCard             ← Icon/Thumbnail + Name + Typ-Label + Item-Count
├── ItemGrid                    ← Poster-Raster aller Items einer Bibliothek
│   ├── ItemToolbar             ← Filter, Sortierung, Suche, Zurück-Button
│   └── ItemCard                ← Poster + Title + Typ-Badge + Watched-Overlay
├── MediaPlayer                 ← beibehalten, leicht improved
└── SyncStatusBadge             ← kleines Inline-Badge "Zuletzt synchronisiert: …"
```

Datei-Aufteilung (statt einer 667-Zeilen-Datei):

```
apps/frontend/src/app/(dashboard)/jellyfin/
├── page.tsx                    ← Orchestrator, State, Routing
├── components/
│   ├── jellyfin-header.tsx     ← Header + Sync-Status
│   ├── library-grid.tsx        ← Bibliotheken-Raster
│   ├── library-card.tsx        ← Einzelne Bibliotheks-Kachel
│   ├── item-grid.tsx           ← Items-Raster mit Filterleiste
│   ├── item-card.tsx           ← Einzelne Poster-Kachel
│   ├── item-toolbar.tsx        ← Filter + Sortierung + Suche
│   ├── media-player.tsx        ← Video/Audio/Photo Player Overlay
│   ├── sync-status-badge.tsx   ← "Zuletzt sync" Badge
│   └── server-connect-dialog.tsx ← Server-Verbinden-Dialog
├── hooks/
│   ├── use-jellyfin-servers.ts ← TanStack Query: servers
│   ├── use-jellyfin-libraries.ts ← TanStack Query: libraries
│   └── use-jellyfin-items.ts   ← TanStack Query: items + toggle
└── types.ts                    ← JellyfinServer, JellyfinLibrary, JellyfinItem Interfaces
```

---

## 4. Detail-Design pro Komponente

### 4.1 JellyfinHeader

Zeigt: Breadcrumb (Jellyfin > [Server] > [Bibliothek]), Sync-Button mit Status, Server-Dropdown.

```tsx
// jellyfin-header.tsx
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-3">
    <Film className="h-6 w-6 text-brand-500" />
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Mediathek</h1>
      <p className="text-sm text-fg-muted">
        {serverUrl && <span className="font-mono text-xs">{serverUrl}</span>}
        {lastSync && <SyncStatusBadge lastSync={lastSync} />}
      </p>
    </div>
  </div>
  <div className="flex items-center gap-2">
    <SyncButton serverId={serverId} onSyncComplete={onSyncComplete} />
    <Button variant="outline" size="sm" onClick={onManageServer}>
      <Settings className="h-4 w-4 mr-1.5" />
      Server
    </Button>
  </div>
</div>
```

### 4.2 LibraryGrid — Kachel-Design

Jede Bibliothek bekommt eine große Kachel mit typ-spezifischem Icon/Thumbnail.

```tsx
// library-grid.tsx
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {libraries.map((lib) => (
    <LibraryCard key={lib.id} library={lib} onClick={() => onSelect(lib.id)} />
  ))}
</div>
```

### 4.3 LibraryCard

```tsx
// library-card.tsx
<button
  onClick={onClick}
  className={cn(
    "group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-200",
    "hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/5",
    "hover:-translate-y-0.5",
    "border-border bg-bg-surface",
    "aspect-[4/3] sm:aspect-[3/2]",
  )}
>
  {/* Background-Gradient basierend auf Typ */}
  <div className={cn(
    "absolute inset-0 opacity-20",
    typeGradients[lib.type ?? 'default'],
  )} />

  {/* Icon / Thumbnail */}
  <div className="relative flex flex-1 items-center justify-center p-8">
    <div className={cn(
      "flex h-20 w-20 items-center justify-center rounded-2xl",
      "bg-brand-500/10 text-brand-500",
      "group-hover:scale-110 transition-transform duration-200",
    )}>
      <LibraryIcon type={lib.type} className="h-10 w-10" />
    </div>
  </div>

  {/* Footer */}
  <div className="relative border-t border-border/50 bg-bg-surface/80 backdrop-blur-sm px-4 py-3">
    <p className="text-sm font-semibold truncate">{lib.name}</p>
    <div className="flex items-center justify-between mt-1">
      <span className="text-xs text-fg-muted">
        {TYPE_LABELS[lib.type ?? ''] ?? lib.type ?? 'Unbekannt'}
      </span>
      {itemCount != null && (
        <span className="text-xs text-fg-muted font-mono">
          {itemCount} Items
        </span>
      )}
    </div>
  </div>
</button>
```

Typ-spezifische Farbverläufe:

```tsx
const typeGradients: Record<string, string> = {
  movies:    "bg-gradient-to-br from-red-500/30 via-orange-500/20 to-transparent",
  tvshows:   "bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-transparent",
  music:     "bg-gradient-to-br from-green-500/30 via-emerald-500/20 to-transparent",
  photos:    "bg-gradient-to-br from-pink-500/30 via-rose-500/20 to-transparent",
  books:     "bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-transparent",
  default:   "bg-gradient-to-br from-brand-500/20 via-brand-500/10 to-transparent",
};
```

Typ-spezifische Icons:

```tsx
function LibraryIcon({ type, className }: { type: string | null; className?: string }) {
  switch (type) {
    case 'movies':    return <Film className={className} />;
    case 'tvshows':   return <Tv className={className} />;
    case 'music':     return <Music className={className} />;
    case 'photos':    return <ImageIcon className={className} />;
    case 'books':     return <BookOpen className={className} />;
    default:          return <Folder className={className} />;
  }
}
```

### 4.4 ItemGrid — Poster-Raster

```tsx
// item-grid.tsx
<div className="space-y-4">
  <ItemToolbar
    filter={filter}
    onFilterChange={setFilter}
    sortBy={sortBy}
    onSortChange={setSortBy}
    searchQuery={searchQuery}
    onSearchChange={setSearchQuery}
    totalCount={items.length}
    filteredCount={filtered.length}
  />

  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
    {filtered.map((item) => (
      <ItemCard
        key={item.id}
        item={item}
        onPlay={() => setPlayingItem(item)}
        onToggleWatched={() => toggleMut.mutate(item.id)}
      />
    ))}
  </div>
</div>
```

### 4.5 ItemCard — Poster-Kachel (Kernstück)

```tsx
// item-card.tsx
<div
  className={cn(
    "group relative flex flex-col overflow-hidden rounded-lg",
    "border border-border bg-bg-surface",
    "transition-all duration-200 ease-out",
    "hover:border-brand-500/40 hover:shadow-xl hover:shadow-black/20",
    "hover:-translate-y-1 hover:scale-[1.02]",
    "cursor-pointer",
    "aspect-[2/3]",  // Poster-Verhältnis
  )}
  onClick={onPlay}
>
  {/* Poster / Thumbnail */}
  <div className="relative flex-1 overflow-hidden bg-bg-raised">
    {posterUrl ? (
      <img
        src={posterUrl}
        alt={item.name}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
    ) : (
      <div className="flex h-full items-center justify-center bg-bg-raised">
        <ItemFallbackIcon type={item.type} />
      </div>
    )}

    {/* Watched-Overlay (oben rechts) */}
    {item.watched && (
      <div className="absolute top-2 right-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/90 text-white shadow-md">
          <Check className="h-3.5 w-3.5" />
        </div>
      </div>
    )}

    {/* Hover-Overlay: Play-Button + Aktionen */}
    <div className={cn(
      "absolute inset-0 flex items-center justify-center",
      "bg-black/0 group-hover:bg-black/40",
      "transition-colors duration-200",
    )}>
      <div className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full",
        "bg-brand-500 text-white shadow-2xl",
        "opacity-0 group-hover:opacity-100",
        "scale-75 group-hover:scale-100",
        "transition-all duration-200",
      )}>
        <Play className="h-6 w-6 ml-0.5" />
      </div>
    </div>

    {/* Typ-Badge (unten links) */}
    <div className="absolute bottom-2 left-2">
      <span className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5",
        "text-[10px] font-semibold uppercase tracking-wide",
        "bg-black/70 text-white backdrop-blur-sm",
      )}>
        {TYPE_LABELS[item.type] ?? item.type}
      </span>
    </div>
  </div>

  {/* Footer: Titel + Watched-Toggle */}
  <div className="border-t border-border/50 px-3 py-2.5">
    <p className="text-xs font-medium truncate leading-tight">{item.name}</p>
    <div className="flex items-center justify-between mt-1.5">
      <button
        onClick={(e) => { e.stopPropagation(); onToggleWatched(); }}
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
          item.watched
            ? "text-green-500 hover:bg-green-500/10"
            : "text-fg-muted hover:text-fg hover:bg-bg-raised",
        )}
      >
        {item.watched ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        {item.watched ? 'Gesehen' : 'Ungesehen'}
      </button>
    </div>
  </div>
</div>
```

**Poster-Thumbnail-Logik:**

Das aktuelle Backend liefert kein Poster-Thumbnail. Zwei Optionen:

**Option A (Empfohlen — Jellyfin-Proxy):**
Neuer Endpoint im Backend, der das Poster direkt von Jellyfin lädt:

```
GET /api/v1/jellyfin/items/:id/image?type=primary&maxWidth=300
```

Dafür in `jellyfin.service.ts` erweitern:

```ts
async getItemImage(ownerId: string, itemId: string, imageType: string = 'primary', maxWidth: number = 300) {
  const item = await this.repo.findItemById(itemId);
  if (!item || item.ownerId !== ownerId) throw new NotFoundException();
  const library = await this.repo.findLibraryById(item.libraryId);
  const server = await this.repo.findServerById(library!.serverId);

  const url = `${server!.url}/Items/${item.externalId}/Images/${imageType}?maxWidth=${maxWidth}&quality=90`;
  const res = await fetch(url, {
    headers: { 'X-Emby-Token': server!.apiKey },
  });

  return { stream: res.body, contentType: res.headers.get('content-type') ?? 'image/jpeg' };
}
```

Frontend-URL dann:
```ts
const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const posterUrl = item.externalId
  ? `http://${apiHost}:3007/api/v1/jellyfin/items/${item.id}/image?token=${accessToken}`
  : null;
```

**Option B (Fallback — Icon-Platzhalter):**
Bis der Image-Endpoint implementiert ist, wird ein typ-basiertes Icon als Platzhalter angezeigt (wie oben im Code als `ItemFallbackIcon`).

### 4.6 ItemToolbar

```tsx
// item-toolbar.tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex items-center gap-3">
    <button onClick={onBack} className={cn(
      "flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5",
      "text-xs font-medium text-fg hover:bg-bg-raised transition-colors",
    )}>
      <ArrowLeft className="h-3.5 w-3.5" />
      Zurück
    </button>
    <h2 className="text-lg font-semibold">{libraryName}</h2>
    <span className="text-xs text-fg-muted font-mono">
      {filteredCount}/{totalCount}
    </span>
  </div>

  <div className="flex items-center gap-2">
    {/* Suche */}
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Suche…"
        className={cn(
          "rounded-md border border-border bg-bg pl-8 pr-3 py-1.5",
          "text-xs w-40 focus:outline-none focus:ring-2 focus:ring-brand-500/50",
          "placeholder:text-fg-muted",
        )}
      />
    </div>

    {/* Filter-Tabs */}
    <div className="flex gap-0.5 rounded-md border border-border bg-bg p-0.5">
      {(['all', 'unwatched', 'watched'] as const).map((f) => (
        <button
          key={f}
          onClick={() => onFilterChange(f)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            filter === f ? "bg-brand-500 text-bg" : "text-fg-muted hover:text-fg",
          )}
        >
          {f === 'all' ? 'Alle' : f === 'watched' ? 'Gesehen' : 'Ungesehen'}
        </button>
      ))}
    </div>

    {/* Sortierung */}
    <select
      value={sortBy}
      onChange={(e) => onSortChange(e.target.value)}
      className={cn(
        "rounded-md border border-border bg-bg px-2 py-1.5",
        "text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/50",
      )}
    >
      <option value="name">Name</option>
      <option value="type">Typ</option>
      <option value="watched">Status</option>
    </select>
  </div>
</div>
```

### 4.7 SyncStatusBadge

```tsx
// sync-status-badge.tsx
function SyncStatusBadge({ lastSync }: { lastSync: Date | string | null }) {
  if (!lastSync) return null;
  const ago = formatRelativeTime(new Date(lastSync));
  return (
    <span className="inline-flex items-center gap-1 ml-2 text-xs text-fg-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      Sync {ago}
    </span>
  );
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours}h`;
  const days = Math.floor(hours / 24);
  return `vor ${days}d`;
}
```

### 4.8 MediaPlayer (verbessert)

Der bestehende Player bleibt erhalten. Kleinste Verbesserung:

```tsx
// media-player.tsx — Änderungen
// 1. Biggerer Close-Button, bessere Title-Bar
// 2. Keyboard-Shortcuts: Escape schließt, Space pausiert
// 3. Ladezustand mit Skeleton statt leerem Spinner

useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  window.addEventListener('keydown', handleKey);
  return () => window.removeEventListener('keydown', handleKey);
}, [onClose]);
```

---

## 5. Datenfluss & Query-Keys

### 5.1 Query-Struktur

```ts
// hooks/use-jellyfin-servers.ts
export function useJellyfinServers() {
  return useQuery<JellyfinServer[]>({
    queryKey: ['jellyfin-servers'],
    queryFn: () => api.get('/jellyfin/servers'),
    staleTime: 30_000,
  });
}

// hooks/use-jellyfin-libraries.ts
export function useJellyfinLibraries(serverId: string | null) {
  return useQuery<JellyfinLibrary[]>({
    queryKey: ['jellyfin-libraries', serverId],
    queryFn: () => api.get(`/jellyfin/libraries?serverId=${serverId}`),
    enabled: !!serverId,
    staleTime: 30_000,
  });
}

// hooks/use-jellyfin-items.ts
export function useJellyfinItems(libraryId: string | null) {
  const qc = useQueryClient();
  const toggleMut = useMutation({
    mutationFn: (itemId: string) => api.post(`/jellyfin/items/${itemId}/toggle-watched`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jellyfin-items', libraryId] });
    },
  });

  const items = useQuery<JellyfinItem[]>({
    queryKey: ['jellyfin-items', libraryId],
    queryFn: () => api.get(`/jellyfin/items?libraryId=${libraryId}`),
    enabled: !!libraryId,
    staleTime: 60_000,
  });

  return { ...items, toggleMut };
}
```

### 5.2 Query-Invalidierung

| Aktion | Query-Key invalidiert |
|--------|----------------------|
| Server verbunden | `['jellyfin-servers']` |
| Server gelöscht | `['jellyfin-servers']`, `['jellyfin-libraries']` |
| Sync abgeschlossen | `['jellyfin-libraries']`, `['jellyfin-items']` |
| Watched getoggelt | `['jellyfin-items', libraryId]` |

---

## 6. Responsive Breakpoints

| Bildschirm | Spalten LibraryGrid | Spalten ItemGrid | Card-Größe |
|------------|--------------------|--------------------|-------------|
| Mobile (<640px) | 1 | 2 | Vollbreite / 2 Spalten |
| Tablet (640–1023px) | 2 | 3–4 | 2 Spalten |
| Desktop (1024–1279px) | 3 | 5 | 3 Spalten |
| Large (≥1280px) | 4 | 6–7 | 4 Spalten |

---

## 7. Animationen & Transitions

Alle Animationen via Tailwind + Framer Motion (optional):

| Element | Animation | Dauer |
|---------|-----------|-------|
| LibraryCard Hover | `-translate-y-0.5`, `shadow-lg`, `border-brand-500/50` | 200ms |
| ItemCard Hover | `-translate-y-1`, `scale(1.02)`, `shadow-xl` | 200ms |
| Play-Button Hover | `opacity-0→1`, `scale(75%→100%)` | 200ms |
| Poster Bild | `scale(1→1.05)` on Card-Hover | 300ms |
| Page-Wechsel | `opacity 0→1`, `y 8→0` | 200ms |
| Grid-Loading | Skeleton-Platzhalter pulsierend | — |

`prefers-reduced-motion`: Alle Transitions und Transforms werden deaktiviert.

---

## 8. Empty-States

### Kein Server verbunden
```tsx
<div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16">
  <Server className="h-16 w-16 mb-4 text-fg-muted opacity-30" />
  <p className="text-lg font-medium">Noch kein Server verbunden</p>
  <p className="text-sm text-fg-muted mt-1 mb-4">
    Verbinde deinen Jellyfin-Server, um deine Mediathek zu durchsuchen.
  </p>
  <Button onClick={onConnect} variant="primary">
    <Plus className="h-4 w-4 mr-1.5" />
    Server verbinden
  </Button>
</div>
```

### Keine Bibliotheken nach Sync
```tsx
<div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16">
  <Film className="h-16 w-16 mb-4 text-fg-muted opacity-30" />
  <p className="text-lg font-medium">Keine Bibliotheken gefunden</p>
  <p className="text-sm text-fg-muted mt-1">
    Der Server enthält keine Bibliotheken oder der Sync ist noch nicht abgeschlossen.
  </p>
</div>
```

### Items-Ladezustand (Skeleton)
```tsx
<div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
  {Array.from({ length: 12 }).map((_, i) => (
    <div key={i} className="aspect-[2/3] rounded-lg bg-bg-raised animate-pulse" />
  ))}
</div>
```

---

## 9. Backend-Änderungen (minimal)

### 9.1 Neuer Endpoint: Item-Image-Proxy

```
GET /api/v1/jellyfin/items/:id/image?type=primary&maxWidth=300
```

- `type`: `primary`, `backdrop`, `banner`, `thumb` (Jellyfin-ImageTypes)
- `maxWidth`: max. Bildbreite in Pixel (Jellyfin skaliert automatisch)
- Response: Binary Stream mit `Content-Type: image/jpeg`
- Auth: Bearer Token (wie alle anderen Endpoints)

### 9.2 Neuer Endpoint: Server-Sync-Status

```
GET /api/v1/jellyfin/servers/:id/status
```

Response:
```json
{
  "lastSyncAt": "2026-06-18T14:30:00Z",
  "libraryCount": 4,
  "itemCount": 1247,
  "syncInProgress": false
}
```

Dafür in `jellyfin_servers` Tabelle: `last_sync_at TIMESTAMP` Spalte hinzufügen.

### 9.3 Optionale Erweiterung: Item-Metadaten

Falls Jellyfin zusätzliche Daten liefert (Jahr, Bewertung, Genre), können diese in `jellyfin_items` ergänzt werden:

```sql
ALTER TABLE jellyfin.jellyfin_items
  ADD COLUMN year INTEGER,
  ADD COLUMN rating DECIMAL(3,1),
  ADD COLUMN genres TEXT[],
  ADD COLUMN overview TEXT,
  ADD COLUMN primary_image_url TEXT;
```

Das erlaubt: Jahresfilter, Genre-Chips, Bewertungsanzeige auf den Postern.

---

## 10. Zusammenfassung der Änderungen

| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `page.tsx` | Refactor | Aufteilen in Sub-Komponenten, State-Hooks |
| `components/jellyfin-header.tsx` | Neu | Header mit Breadcrumb + Sync-Status |
| `components/library-grid.tsx` | Neu | Raster-Layout der Bibliotheken |
| `components/library-card.tsx` | Neu | Kachel mit Gradient, Icon, Hover |
| `components/item-grid.tsx` | Neu | Poster-Raster mit Filterleiste |
| `components/item-card.tsx` | Neu | Poster-Kachel mit Hover-Overlay |
| `components/item-toolbar.tsx` | Neu | Suche, Filter, Sortierung |
| `components/media-player.tsx` | Refactor | Aus page.tsx ausgelagert, Keyboard-Shortcuts |
| `components/server-connect-dialog.tsx` | Refactor | Aus page.tsx ausgelagert |
| `components/sync-status-badge.tsx` | Neu | Inline-Badge für Sync-Zeitpunkt |
| `hooks/use-jellyfin-servers.ts` | Neu | TanStack Query Hook |
| `hooks/use-jellyfin-libraries.ts` | Neu | TanStack Query Hook |
| `hooks/use-jellyfin-items.ts` | Neu | TanStack Query Hook + toggleMut |
| `types.ts` | Neu | Shared Interfaces |
| `domains/jellyfin/src/api/jellyfin.controller.ts` | Ändern | +2 Endpoints (image, status) |
| `domains/jellyfin/src/services/jellyfin.service.ts` | Ändern | +2 Methoden (getItemImage, getSyncStatus) |
| `domains/jellyfin/src/repositories/jellyfin.repository.ts` | Ändern | +getSyncStatus Query |
| `shared/db/schema/jellyfin.ts` | Ändern | +last_sync_at Spalte |

---

## 11. Priorisierung

| Phase | Umfang | Aufwand |
|-------|--------|---------|
| **P1 — Core-Redesign** | Page-Aufteilung, LibraryCard, ItemCard, ItemGrid, Toolbar, Empty-States | ~4h |
| **P2 — Poster-Images** | Backend-Image-Proxy, Poster-URLs in ItemCards | ~2h |
| **P3 — Sync-Status** | last_sync_at Spalte, Status-API, Badge in Header | ~1h |
| **P4 — Metadaten** | Year, Rating, Genres in DB + UI-Filter | ~2h |
| **P5 — Player-Improvements** | Keyboard-Shortcuts, bessere Ladezustände | ~1h |

Gesamt geschätzt: ~10h für vollständiges Redesign.
