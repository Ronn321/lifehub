# Jellyfin Redesign — Design Spec v1

Framework: LifeHub UI_UX.md (Dark Default, Amber Brand, shadcn/ui, Tailwind)
Datum: 2026-06-18
Status: Entwurf

---

## 1. Komponenten-Hierarchie (Zielstruktur)

```
apps/frontend/src/app/(dashboard)/jellyfin/
├── page.tsx                         ← Orchestrierung, State-Management
├── components/
│   ├── jellyfin-header.tsx          ← Titel + Sync-Status + Server-Verbinden-Button
│   ├── server-section.tsx           ← Server-Karten + Connect/Delete/Sync
│   ├── connect-dialog.tsx           ← Modal (bleibt ähnlich)
│   ├── library-grid.tsx             ← Kachel-Raster für Bibliotheken
│   ├── library-card.tsx             ← Einzelne Bibliotheks-Kachel
│   ├── item-grid.tsx                ← Poster-Raster für Medien-Items
│   ├── item-card.tsx                ← Poster-Kachel mit Hover-Overlay
│   ├── item-filter-bar.tsx          ← Filter (Alle/Gesehen/Ungesehen) + Sortierung
│   ├── sync-status-badge.tsx        ← Zeigt „Zuletzt sync: vor X min"
│   └── media-player.tsx             ← Fullscreen-Player (bleibt, aber verbessert)
└── hooks/
    ├── use-jellyfin-servers.ts      ← Query-Hooks
    ├── use-jellyfin-libraries.ts
    ├── use-jellyfin-items.ts
    └── use-jellyfin-mutations.ts    ← Mutation-Hooks
```

**Begründung:** Aktuell 667 Zeilen in einer Datei. Extraktion verbessert:
- Bessere Lesbarkeit
- Isolierte Zuständigkeiten
- Leichtere Testing-Möglichkeit
- Wiederverwendbare Karten-Komponenten

---

## 2. Seiten-Layout (page.tsx — neue Struktur)

```
┌──────────────────────────────────────────────────────┐
│ Jellyfin-Header                                      │
│ [Titel] "Jellyfin"                     [Sync-Status] │
│ [Sub] "Verwalte deine Mediathek …"                   │
├──────────────────────────────────────────────────────┤
│ Server-Section                                       │
│ ┌──────────────────┐  ┌──────────────────┐           │
│ │ Server 1          │  │ Server 2          │           │
│ │ jellyfin.local     │  │ media.local       │           │
│ │ [Sync] [Browse] [×]│  │ [Sync] [Browse] [×]│          │
│ └──────────────────┘  └──────────────────┘           │
│                          [+ Server verbinden]         │
├──────────────────────────────────────────────────────┤
│ Library-Grid (wenn Server ausgewählt)                │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│ │ 🎬     │ │ 📺     │ │ 🎵     │ │ 📷     │         │
│ │ Filme  │ │ Serien │ │ Musik  │ │ Fotos  │         │
│ │ 42     │ │ 18     │ │ 156    │ │ 2304   │         │
│ └────────┘ └────────┘ └────────┘ └────────┘         │
├──────────────────────────────────────────────────────┤
│ Item-Filter-Bar (wenn Bibliothek ausgewählt)         │
│ [← Zurück]  "Filme"        [Alle|Gesehen|Ungesehen]  │
├──────────────────────────────────────────────────────┤
│ Item-Grid (Poster-Raster)                            │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │poster│ │poster│ │poster│ │poster│ │poster│       │
│ │Titel │ │Titel │ │Titel │ │Titel │ │Titel │       │
│ │◉ geseh│ │○ ung.│ │◉ geseh│ │○ ung.│ │◉ geseh│       │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │
│                                                       │
│ 2–6 Spalten responsive, Masonry-ähnlich              │
└──────────────────────────────────────────────────────┘
```

---

## 3. Tailwind/CSS-Klassen pro Komponente

### 3.1 Server-Section (server-section.tsx)

| Element | Tailwind-Klassen | Effekt |
|---------|-----------------|--------|
| Container | `rounded-xl border border-border bg-bg-surface p-6 space-y-4` | Leicht abgesetzte Section |
| Server-Karte (inaktiv) | `flex items-center gap-4 rounded-lg border border-border bg-bg p-4 hover:border-brand-500/40 hover:shadow-md hover:bg-bg-raised transition-all duration-200` | Hover-Hebung |
| Server-Karte (aktiv) | `ring-2 ring-brand-500/60 border-brand-500/40 bg-brand-500/5` | Aktive Markierung |
| Server-Icon | `flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500` | Brand-Hintergrund |
| Sync-Button | `inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-medium text-bg hover:bg-brand-400 disabled:opacity-50 transition-colors` | Brand-Primär |
| Browse-Button | `inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-fg hover:bg-bg transition-colors` | Outline-Sekundär |
| Delete-Button | `rounded-lg p-2 text-fg-muted hover:text-danger hover:bg-danger/10 transition-colors` | Gefahr-Hover |
| Grid-Container | `grid gap-4 md:grid-cols-2` | Responsive Server-Kacheln |
| Empty-State | `flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-14 text-fg-muted` | Gestrichelter Empty-State |

### 3.2 Library-Card (library-card.tsx)

| Element | Tailwind-Klassen | Effekt |
|---------|-----------------|--------|
| Container | `group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-bg p-6 hover:border-brand-500/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer` | Kachel mit Hover-Lift |
| Icon-Wrapper | `flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500 group-hover:scale-110 transition-transform duration-200` | Icon-Vergrößerung bei Hover |
| Typ-Label | `text-xs font-medium text-brand-500 tracking-wide uppercase` | Brand-Akzent-Zeile |
| Name | `text-sm font-semibold text-fg text-center truncate max-w-full` | Name zentriert |
| Item-Count | `text-xs text-fg-muted` | Anzahl Medien |
| Grid | `grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` | Responsive Bibliotheken |

**Library-Typ-Icons** (pro `type`):
- `movies` → `Film` (Lucide)
- `tvshows` → `Monitor` 
- `music` → `Music`
- `photos` → `Image`
- `books` → `BookOpen`
- Default → `Folder`

### 3.3 Item-Card / Poster-Kachel (item-card.tsx)

| Element | Tailwind-Klassen | Effekt |
|---------|-----------------|--------|
| Container | `group relative flex flex-col rounded-xl border border-border bg-bg overflow-hidden hover:border-brand-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300` | Poster-Kachel mit Hover-Elevation |
| Poster-Container | `relative aspect-[2/3] w-full bg-bg-raised overflow-hidden` | 2:3-Poster-Verhältnis |
| Poster-Fallback | `flex h-full w-full items-center justify-center text-fg-muted/30` | Fallback-Icon bei fehlendem Poster |
| Poster-Image | `h-full w-full object-cover group-hover:scale-105 transition-transform duration-500` | Zoom-Effekt bei Hover |
| Hover-Overlay | `absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/60 transition-all duration-200` | Verdunkelung + Play-Button bei Hover |
| Play-Button (Hover) | `opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-bg shadow-lg` | Erscheint bei Hover |
| Info-Bereich | `flex flex-col gap-1 p-3` | Unterhalb Poster |
| Titel | `text-sm font-semibold text-fg truncate` | Eindeutiger Titel |
| Sub-Typ | `text-xs text-fg-muted` | Typ-Label |
| Watched-Badge (oben) | `absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-500/90 text-white shadow-sm` | Grüner "Gesehen"-Badge |
| Unwatched-Badge | `absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-neutral-900/70 text-white/80` | Subtiler Badge |
| Progress-Bar | `w-full h-1 bg-bg-raised overflow-hidden` optional | Für Serie-Fortschritt |

**Grid-Layout responsive:**
```
sm:grid-cols-2   → 2 Spalten (Mobile)
md:grid-cols-3   → 3 Spalten
lg:grid-cols-4   → 4 Spalten
xl:grid-cols-5   → 5 Spalten
2xl:grid-cols-6  → 6 Spalten (breiter Desktop)
```

### 3.4 Item-Filter-Bar (item-filter-bar.tsx)

| Element | Tailwind-Klassen |
|---------|-----------------|
| Container | `flex items-center justify-between mb-4` |
| Back-Button | `inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg transition-colors` |
| Filter-Gruppe | `flex gap-1 rounded-lg border border-border bg-bg p-0.5` |
| Filter-Aktiv | `rounded-md px-3 py-1 text-xs font-medium bg-brand-500 text-bg` |
| Filter-Inaktiv | `rounded-md px-3 py-1 text-xs font-medium text-fg-muted hover:text-fg transition-colors` |
| Sort-Select | `rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-fg` |

**Filter-Optionen:**
- `all` → "Alle" 
- `unwatched` → "Ungesehen"
- `watched` → "Gesehen"

**Sort-Optionen (neu):**
- `name` → "Name A–Z"
- `name_desc` → "Name Z–A"
- `newest` → "Neueste zuerst"
- `oldest` → "Älteste zuerst"

### 3.5 Sync-Status-Badge (sync-status-badge.tsx)

| Element | Tailwind-Klassen |
|---------|-----------------|
| Container | `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs` |
| Grün | `bg-green-500/10 text-green-500` — "Synchronisiert • vor 3 Min" |
| Gelb | `bg-warning/10 text-warning` — "Synchronisation läuft …" |
| Rot | `bg-danger/10 text-danger` — "Sync fehlgeschlagen" |
| Punkt-Indikator | `h-2 w-2 rounded-full` (Farbe je nach Status) |
| Refresh-Button | `ml-2 rounded-md p-1 text-fg-muted hover:text-fg hover:bg-bg transition-colors` |

### 3.6 Media-Player (media-player.tsx — Verbesserungen)

| Aspekt | Änderung |
|--------|----------|
| Hintergrund | `bg-black/80 backdrop-blur-sm` statt `bg-black/80` |
| Player-Container | `rounded-xl shadow-2xl` statt `rounded-lg` |
| Controls-Overlay | Optional: Eigene Controls-UI (Play/Pause, Seek, Volume, Fullscreen, Kapitel) |
| Audio-Player | Statt `rounded-full` → Design mit Album-Art-Placeholder, Waveform-Visualisierung |
| Shortcuts | Leertaste Play/Pause, Esc schließen, ← → 10s springen |
| Key-Handler | `useEffect` mit `keydown`-Listener für global shortcuts |

### 3.7 Skeleton-States (neu)

```
┌───────────────────┐    ┌──────────────────┐
│ Server-Skeleton    │    │ Library-Skeleton  │
│ ┌───────────────┐ │    │ ┌──┐ ┌──┐ ┌──┐  │
│ │ ████████████  │ │    │ │██│ │██│ │██│  │
│ │ ██████        │ │    │ └──┘ └──┘ └──┘  │
│ └───────────────┘ │    └──────────────────┘
│ ┌───────────────┐ │
│ │ ████████████  │ │    ┌──────────────────┐
│ │ ██████        │ │    │ Item-Skeleton     │
│ └───────────────┘ │    │ ┌──┐ ┌──┐ ┌──┐  │
└───────────────────┘    │ │██│ │██│ │██│  │
                         │ │  │ │  │ │  │  │
Tailwind: animate-pulse   │ └──┘ └──┘ └──┘  │
rounded-lg bg-bg-raised   └──────────────────┘
```

---

## 4. Datenfluss (API-Calls & Query-Keys)

### 4.1 Aktuelle Query-Keys (müssen erhalten bleiben für Backward-Compat)

```typescript
// Bestehende Keys (unverändert)
['jellyfin-servers']                          // GET /jellyfin/servers
['jellyfin-libraries', serverId]              // GET /jellyfin/libraries?serverId=X
['jellyfin-items', libraryId]                 // GET /jellyfin/items?libraryId=X
```

### 4.2 Neue Query-Keys (optional, für erweiterte Features)

```typescript
['jellyfin-sync-status', serverId]            // GET /jellyfin/servers/X/sync-status
['jellyfin-item', itemId]                     // GET /jellyfin/items/X (Detail-Ansicht)
['jellyfin-item-poster', itemId, 'primary']    // GET /jellyfin/items/X/images/primary
```

### 4.3 Bestehende Mutations (unverändert)

```typescript
// POST /jellyfin/servers                    → invalidate: ['jellyfin-servers']
// DELETE /jellyfin/servers/:id              → invalidate: ['jellyfin-servers']
// POST /jellyfin/servers/:id/sync           → invalidate: ['jellyfin-libraries', 'jellyfin-items']
// POST /jellyfin/items/:id/toggle-watched   → invalidate: ['jellyfin-items', libraryId]
```

### 4.4 Neue vorgeschlagene Endpoints (Backend)

```typescript
// GET /jellyfin/servers/:id/sync-status     → { lastSyncAt: string, status: 'idle'|'syncing'|'error', itemCount: number }
// GET /jellyfin/items/:id                   → Detail-Item (inklusive Poster-URLs, Beschreibung, Dauer)
// GET /jellyfin/items/:id/images/:type      → Poster/Backdrop-Bild (proxied von Jellyfin)
```

### 4.5 Datenfluss-Diagramm

```
User öffnet /jellyfin
  │
  ├─→ useJellyfinServers()
  │     GET /jellyfin/servers
  │     ├─→ Erfolg: Server-Cards anzeigen
  │     └─→ Fehler: Error-State
  │
  ├─→ User klickt Server
  │     ├─→ selectedServer setzen
  │     └─→ useJellyfinLibraries(serverId)
  │           GET /jellyfin/libraries?serverId=X
  │           ├─→ Erfolg: Library-Grid anzeigen
  │           └─→ Fehler: Error-State
  │
  └─→ User klickt Bibliothek
        ├─→ selectedLibrary setzen
        ├─→ useJellyfinItems(libraryId)
        │     GET /jellyfin/items?libraryId=Y
        │     ├─→ Erfolg: Item-Grid (Poster-Kacheln)
        │     └─→ Fehler: Error-State
        │
        ├─→ User toggelt Watched
        │     POST /jellyfin/items/:id/toggle-watched
        │     → Optimistic Update + invalidate
        │
        └─→ User spielt Item ab
              → MediaPlayer-Komponente
              → streamUrl = `${apiHost}/api/v1/jellyfin/items/${id}/stream?token=${jwt}`
```

---

## 5. Konkrete Verbesserungsvorschläge

### 5.1 Sofort umsetzbar (nur Frontend-Änderungen)

| # | Verbesserung | Aufwand | Impact |
|---|-------------|---------|--------|
| 1 | **Library-Kacheln** mit Typ-Icons + Item-Count + Hover-Lift | 2h | ★★★★★ |
| 2 | **Poster-Grid** statt Liste: aspect-[2/3]-Kacheln mit Hover-Overlay | 4h | ★★★★★ |
| 3 | **Skeleton-States** für Server/Libraries/Items | 1h | ★★★★☆ |
| 4 | **Back-Button** nicht nur Text, sondern `←` + Breadcrumb | 0.5h | ★★★☆☆ |
| 5 | **Filter-Bar** in Items + Sort-Optionen | 1h | ★★★☆☆ |
| 6 | **Watched/Unwatched-Badge** auf Poster-Kachel | 1h | ★★★★☆ |
| 7 | **Empty-States** verbessern (Illustration + Aktion) | 0.5h | ★★★☆☆ |
| 8 | **Sync-Status** mit letztem Sync-Zeitstempel | 1h | ★★★★☆ |
| 9 | **Key-Shortcuts** (Esc = zurück, Leertaste = play) | 1h | ★★★☆☆ |
| 10 | **Component-Extraktion** in separate Dateien | 2h | ★★☆☆☆ |

### 5.2 Mittelfristig (Backend-Änderungen nötig)

| # | Verbesserung | Aufwand | Impact |
|---|-------------|---------|--------|
| 11 | **Poster/Thumbnail-Proxy** (`GET /items/:id/images/:type`) | 4h | ★★★★★ |
| 12 | **Item-Count pro Bibliothek** im Libraries-Response | 1h | ★★★★☆ |
| 13 | **Sync-Status-Endpoint** (`GET /servers/:id/sync-status`) | 2h | ★★★★☆ |
| 14 | **Last-Sync-Date** im Server-Response speichern | 1h | ★★★★☆ |
| 15 | **Item-Detail-Endpoint** mit Metadaten (Dauer, Genre, Jahr) | 3h | ★★★☆☆ |

### 5.3 Langfristig (größere Features)

| # | Verbesserung | Aufwand | Impact |
|---|-------------|---------|--------|
| 16 | **Weiterschauen-Weiterleiten** (Resume-Position speichern) | 8h | ★★★★★ |
| 17 | **Serien-Staffel-Ansicht** (Season-Picker, Episoden-Raster) | 8h | ★★★★★ |
| 18 | **Globale Suche** über Jellyfin-Bestand integrieren | 6h | ★★★★☆ |
| 19 | **Playlisten** anlegen / Favoriten | 8h | ★★★☆☆ |
| 20 | **Framer Motion**-Animationen für Page Transitions + Grid Stagger | 2h | ★★★☆☆ |

### 5.4 Konkrete Code-Änderungen (Priorisiert)

#### P0 — Library-Kacheln als Kachel-Design

```tsx
// library-card.tsx
export function LibraryCard({ library, itemCount, onSelect }: Props) {
  const ICON = {
    movies: Film, tvshows: Monitor, music: Music,
    photos: Image, books: BookOpen,
  }[library.type ?? ''] ?? Folder;

  return (
    <button onClick={() => onSelect(library.id)}
      className="group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-bg p-6 hover:border-brand-500/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500 group-hover:scale-110 transition-transform duration-200">
        <ICON className="h-7 w-7" />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-xs font-medium text-brand-500 tracking-wide uppercase">
          {TYPE_LABELS[library.type ?? ''] ?? library.type ?? 'Unbekannt'}
        </p>
        <p className="text-sm font-semibold text-fg truncate max-w-[160px]">
          {library.name}
        </p>
        {itemCount !== undefined && (
          <p className="text-xs text-fg-muted">{itemCount} Medien</p>
        )}
      </div>
    </button>
  );
}
```

#### P0 — Poster-Grid mit Hover-Overlay

```tsx
// item-card.tsx
export function ItemCard({ item, onPlay, onToggleWatched }: Props) {
  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-bg overflow-hidden hover:border-brand-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="relative aspect-[2/3] w-full bg-bg-raised overflow-hidden">
        {item.posterUrl ? (
          <Image src={item.posterUrl} alt={item.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-fg-muted/30">
            <Film className="h-12 w-12" />
          </div>
        )}

        {/* Hover-Overlay: Play-Button */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/60 transition-all duration-200">
          <button onClick={onPlay}
            className="opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-bg shadow-lg hover:bg-brand-400"
          >
            <Play className="h-5 w-5 ml-0.5" />
          </button>
        </div>

        {/* Watched-Badge */}
        <div className={cn(
          "absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm",
          item.watched ? "bg-green-500/90 text-white" : "bg-neutral-900/70 text-white/80"
        )}>
          {item.watched ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          <span>{item.watched ? 'Gesehen' : 'Ungesehen'}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 p-3">
        <p className="text-sm font-semibold text-fg truncate" title={item.name}>
          {item.name}
        </p>
        <p className="text-xs text-fg-muted">
          {TYPE_LABELS[item.type] ?? item.type}
        </p>
      </div>
    </div>
  );
}
```

#### P1 — Sync-Status-Anzeige

```tsx
// sync-status-badge.tsx
export function SyncStatusBadge({ serverId }: { serverId: string }) {
  const { data: syncStatus } = useQuery({
    queryKey: ['jellyfin-sync-status', serverId],
    queryFn: () => api.get(`/jellyfin/servers/${serverId}/sync-status`),
    refetchInterval: 30_000, // Poll alle 30s
  });

  if (!syncStatus) return null;

  const timeAgo = getTimeAgo(syncStatus.lastSyncAt);
  const isGreen = syncStatus.status === 'idle';
  const isYellow = syncStatus.status === 'syncing';
  const isRed = syncStatus.status === 'error';

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs",
      isGreen && "bg-green-500/10 text-green-500",
      isYellow && "bg-warning/10 text-warning",
      isRed && "bg-danger/10 text-danger",
    )}>
      <span className={cn("h-2 w-2 rounded-full",
        isGreen && "bg-green-500",
        isYellow && "bg-warning animate-pulse",
        isRed && "bg-danger",
      )} />
      <span>
        {isYellow ? 'Sync läuft …' : isRed ? 'Sync fehlgeschlagen' : `Sync • ${timeAgo}`}
      </span>
    </div>
  );
}
```

#### P1 — Item-Filter-Bar mit Sortierung

```tsx
// item-filter-bar.tsx
export function ItemFilterBar({
  libraryName, onBack, filter, onFilterChange, sort, onSortChange,
}: Props) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück
        </button>
        <h3 className="text-base font-semibold">{libraryName}</h3>
      </div>

      <div className="flex items-center gap-2">
        {/* Filter */}
        <div className="flex gap-1 rounded-lg border border-border bg-bg p-0.5">
          {filters.map((f) => (
            <button key={f.value} onClick={() => onFilterChange(f.value)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                filter === f.value ? "bg-brand-500 text-bg" : "text-fg-muted hover:text-fg",
              )}
            >{f.label}</button>
          ))}
        </div>

        {/* Sort */}
        <select value={sort} onChange={(e) => onSortChange(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          <option value="name">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
          <option value="newest">Neueste</option>
          <option value="oldest">Älteste</option>
        </select>
      </div>
    </div>
  );
}
```

---

## 6. Abgrenzung & Nicht-Ziele

- **Nicht:** Eigene Jellyfin-Theme-Engine (LifeHub bleibt Wrapper)
- **Nicht:** Transcodierung / Player-Engine (wird von Jellyfin gestreamt)
- **Nicht:** Offline-Sync (kein Download-Manager)
- **Nicht:** User-Management (Jellyfin-seitig)
- **Nicht:** iOS/Android-App (Phase 2+)

---

## 7. Zuständigkeiten laut DOX

- **Frontend-Änderungen:** `apps/frontend/` → lese `apps/frontend/AGENTS.md` vorher
- **Neue API-Endpoints:** `domains/jellyfin/src/api/` → lese `features/jellyfin.AGENTS.md`
- **DB-Änderungen:** `shared/db/src/schema/public.ts` → lese `DATABASE_SCHEMA.md`
- **Design-Entscheidungen:** `UI_UX.md` §6.9 (Jellyfin Detail) + §8 (Theming)

---

## 8. DOX Pass

Nach Umsetzung aktualisieren:
- `features/jellyfin.AGENTS.md` — Frontend-Komponenten-Struktur dokumentieren
- `docs/DOMAIN_STATUS.md` — ggf. Status anpassen
- `docs/CODE_GENERATION_TEMPLATES.md` — neue Component-Patterns festhalten
- Diese Datei (`designs/jellyfin_ds_v1.md`) als abgeschlossen markieren
