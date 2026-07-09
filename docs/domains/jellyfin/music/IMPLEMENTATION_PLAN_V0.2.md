# Music Player v0.2 — Implementierungsplan (Aktualisiert)

**Orchestrator:** Hermes Agent (DeepSeek V4 Flash via OpenCode Go)
**Implementierung:** Subagents (delegiert) + manuelle Fixes
**Referenz:** `docs/domains/jellyfin/music/spotify_*.md` (13 Spec-Dateien)

---

## Status — ALLE Phasen ABGESCHLOSSEN ✅

| Phase | Status | Notes |
|-------|--------|-------|
| 1A Design Tokens | ✅ KOMPLETT | `music-theme.css` + CSS Custom Properties |
| 1B Player Store | ✅ KOMPLETT | `music-player-store.ts` (Zustand + localStorage) |
| 1C Backend API | ✅ KOMPLETT | 8 neue Endpoints + Streaming + Image-Proxy |
| 2A AppShell + Sidebar | ✅ KOMPLETT | 5-Bereich-Layout, Sidebar einklappbar |
| 2B Player Bar | ✅ KOMPLETT | 90px, alle Controls, Keyboard Shortcuts |
| 3A Home Page | ✅ KOMPLETT | Greeting, Quick Access, 3 ScrollRows |
| 3B Search Page | ✅ KOMPLETT | Debounced Search, Top Result, Genre Grid |
| 3C Library Page | ✅ KOMPLETT | Tabs + virtualisierte Song-Tabelle |
| 3D Detailseiten | ✅ KOMPLETT | Album/Artist/Genre/Playlist |
| 4 Now Playing | ✅ KOMPLETT | 3 Modi (Sidebar/Fullscreen/Mini) |
| 5 Polish | ✅ KOMPLETT | Context Menu, Keyboard Shortcuts |

---

## 🚧 Abweichungen vom Original-Spec (wichtige Änderungen)

### 1. Routen: Englisch statt Deutsch
**Spec:** Deutsche Routen (`/jellyfin/musik`, `/suche`, `/bibliothek`, `/kuenstler`)
**Realität:** Englische Routen (`/jellyfin/music`, `/search`, `/library`, `/artist`) — auf User-Wunsch zurückgeändert

### 2. Player-Bar Positionierung
**Spec:** `fixed bottom-0 left-0 right-0 z-50` (absolute Positionierung)
**Realität:** Player-Bar als `w-full` im flex-flow. Positionierung durch Page-Wrapper:
```html
<div class="flex flex-col" style="height: calc(100% + 48px)">
  <div class="flex-1 overflow-y-auto"><!-- scrollbarer Inhalt --></div>
  <div class="flex-shrink-0" style="height: var(--music-player-bar-height)">
    <MusicPlayerWrapper/><!-- sticky bottom-0 im Container -->
  </div>
</div>
```
**Grund:** Überlappte die LifeHub-Sidebar; `fixed` verursachte Layout-Probleme mit der LifeHub-Sidebar

### 3. Layout ohne schwarze Ränder
**Spec:** MusicAppShell als eigenständiges Grid
**Realität:** Negative Margins (`-m-6 lg:-m-8`) um das Padding des LifeHub `<main>` Elements auszugleichen:
```
Music Page ──┐
  ┌─ LifeHub <main> hat p-6 lg:p-8 ──┐
  │ ┌─── -m-6 ───┐                    │
  │ │ MusicAppShell (full width)      │
  │ │ + Player (im flow)              │
  │ └─────────────┘                   │
  └────────────────────────────────────┘
```
**Grund:** `p-6 lg:p-8` im Dashboard-Layout erzeugte überall Abstände; double padding mit MusicAppShell's eigenem Padding

### 4. MusicAppShell Props vereinfacht
**Spec:** `playerBar` und `showPlayerBar` Props
**Realität:** MusicAppShell hat KEINE playerBar-Props mehr. Player wird NACH MusicAppShell im Page-Wrapper gerendert. MusicAppShell ist nur für Sidebar + Content zuständig.

### 5. Sidebar einklappbar
**Spec:** Sidebar immer 240px
**Realität:** Sidebar einklappbar (240px ↔ 64px) mit Toggle-Button oben links (`PanelLeftClose`/`PanelLeftOpen` Icon)
- Zustand wird lokal in MusicAppShell via `useState` verwaltet
- Alle Sidebar-Komponenten haben `collapsed` Prop
- CSS `transition-[width] duration-200 ease-in-out` für sanfte Animation

### 6. Sidebar-Tabs funktional
**Spec:** Statische Tabs (Playlists/Künstler/Alben)
**Realität:** Tabs laden jetzt echte Daten:
- Künstler-Tab: `useArtists(serverId)` — runde 32x32 Mini-Cover
- Alben-Tab: `useRecentAlbums(serverId, 20)` — quadratische 32x32 Mini-Cover
- Playlists-Tab: Platzhalter (kein Jellyfin-Playlist-Endpoint)
- Items sind klickbar → navigieren zur Detailseite
- Im collapsed-Modus: nur Cover-Bilder, keine Texte

### 7. Genres: Musik-spezifisch
**Spec:** `/Genres` Jellyfin-API (liefert ALLE Genres: Filme + Serien + Musik)
**Realität:** Nutzt `/Artists/AlbumArtists?Fields=Genres` und extrahiert unique Musik-Genres
- 31 Musik-Genres (Rock, Pop, Heavy Metal, Jazz, Hip-Hop, etc.)
- Genre-Detailseite: `getSongsByGenre()` → `/Items?IncludeItemTypes=Audio&GenreIds=...&Recursive=true`

### 8. Image-Proxy Fix
**Spec:** `fillHeight=${height}&fillWidth=${width}`
**Realität:** `width=${width}&height=${height}&quality=90&UserId=${userId}`
- `fillHeight`/`fillWidth` sind keine gültigen Jellyfin-Parameter
- `UserId` wird für Autorisierung benötigt

### 9. Backend: findServerOrFallback UUID-Fix
**Problem:** `findServerById("default")` schlug fehl weil `id`-Spalte UUID-Typ ist
**Fix:** Skip DB-Lookup wenn `serverId === 'default'`:
```typescript
if (serverId !== 'default') {
  const server = await this.repo.findServerById(serverId);
  if (server && ...) return server;
}
return { id: 'default', url: this.defaultUrl, ... };

### 10. Hub-Seite (/jellyfin) komplett umgebaut
**Spec:** Media-Player mit Video/Serien-Items + Watch-Status
**Realität:** 4-Card Hub (Filme/Musik/Serien/Bilder) mit:
- Spotify-ähnlichen großen Karten (h-14 w-14 Icons, fette Zahlen)
- Musik-Karte mit "v0.2 Spotify Player" Badge + grünem Gradient
- Server-Status-Karte mit Sync-Button

### 11. Separate Routen für Library-Tabs
**Spec:** Nur `/jellyfin/music/library` mit Tabs
**Realität:** Zusätzlich eigene Routen:
- `/jellyfin/music/tracks` — virtualisierte Song-Tabelle
- `/jellyfin/music/albums` — Album CardGrid
- `/jellyfin/music/artists` — Künstler CardGrid
- `/jellyfin/music/genres` — Genre CardGrid
- `/jellyfin/music/playlists` — Playlist-Liste (Stub)
Library-Seite (`/library`) bleibt mit Tabs bestehen

### 12. PlayerWrapper statt PlayerBar in AppShell
**Spec:** MusicPlayerBar direkt in AppShell
**Realität:** `MusicPlayerWrapper` (Singleton Audio-Element) + MusicPlayerBar (UI):
```tsx
// page.tsx
<MusicPlayerWrapper />  {/* <audio> + Bar + Store-Sync */}
```
Wrapper erzeugt `new Audio()` lazy (browser-only), überlebt Next.js Page-Transitions

---

## Datei-Struktur (alle v0.2 Dateien)

### Frontend Pages (12 Routen)
```
apps/frontend/src/app/(dashboard)/jellyfin/
├── page.tsx                          ← Hub (4 Cards)
├── music/
│   ├── page.tsx                      ← Home
│   ├── search/page.tsx               ← Search
│   ├── library/page.tsx              ← Library (Tabs)
│   ├── tracks/page.tsx               ← Songs (NEU)
│   ├── albums/page.tsx               ← Albums (NEU)
│   ├── artists/page.tsx              ← Artists (NEU)
│   ├── genres/page.tsx               ← Genres (NEU)
│   ├── playlists/page.tsx            ← Playlists (NEU)
│   ├── album/[id]/page.tsx
│   ├── artist/[id]/page.tsx
│   ├── genre/[id]/page.tsx
│   └── playlist/[id]/page.tsx
```

### Frontend Komponenten (11)
```
components/music/
├── layout/MusicAppShell.tsx          ← Flex-Layout (kein playerBar-Prop)
├── layout/MusicLayout.tsx
├── sidebar/MusicSidebar.tsx          ← +collapsed State + Tab-Items
├── sidebar/SidebarNavButton.tsx      ← +collapsed Prop
├── sidebar/SidebarPlaylistItem.tsx   ← +collapsed Prop
├── sidebar/SidebarCreateButton.tsx   ← +collapsed Prop
├── player/MusicPlayerBar.tsx         ← w-full (kein fixed)
├── player/MusicPlayerWrapper.tsx     ← <audio> + Store-Sync (NEU)
├── nowplaying/NowPlayingView.tsx
├── shared/MusicCard.tsx
├── shared/SongRow.tsx
└── shared/ContextMenu.tsx
```

### Library/Store
```
lib/
├── music-player-store.ts             ← Zustand v5 (Queue, Shuffle, Repeat, Persist)
└── music-api.ts                      ← 15 TanStack Query Hooks
```

### Backend (jellyfin.domain)
```
domains/jellyfin/src/
├── services/jellyfin.service.ts      ← +8 neue Methoden + Streaming + Image-Proxy
└── api/jellyfin.controller.ts        ← +10 neue Endpoints
```

### Styles
```
app/(dashboard)/jellyfin/music/music-theme.css  ← Spotify CSS Custom Properties
```

---

## Verification

```bash
pnpm --filter @lifehub/frontend typecheck   # ✅ 0 errors
pnpm --filter @lifehub/frontend build        # ✅ (Windows: standalone deaktiviert)
pnpm --filter @lifehub/backend typecheck      # ✅ 0 new errors
```

**Windows Build:** `next build` scheitert an EPERM Symlinks. Workaround: `output: 'standalone'` deaktivieren in `next.config.mjs`. Docker/Linux baut einwandfrei.

---

## Bekannte Einschränkungen

1. **Playlists:** Kein Jellyfin-Playlist-Endpoint im Backend vorhanden — Sidebar-Tab und Seite zeigen "Keine Playlists"
2. **Album/Artist-Klicks von Cards:** Funktionieren via Direct-URL-Navigation (ersetze `router.push` ggf. durch `<Link>`)
3. **Drag & Drop:** Phase 5 Polish — `@dnd-kit` installiert aber nicht integriert
4. **Lyrics:** NowPlayingView hat Lyrics-Tab als Platzhalter (kein Jellyfin-Lyrics-Endpoint)
5. **Mobile:** Keine responsive Anpassung für schmale Bildschirme
6. **Cover ohne Primary Image:** Manche Items haben kein Primary Image in Jellyfin → 404 ist korrekt

---

## Deployment

```bash
# Frontend
npx pnpm --filter @lifehub/frontend build
docker build -t lifehub-frontend:local -f apps/frontend/Dockerfile .
docker rm -f lifehub-frontend
docker run -d --name lifehub-frontend --network lifehub_default -p 3100:3001 --restart always lifehub-frontend:local

# Backend
cd apps/backend && npx tsc -p ../../domains/jellyfin/tsconfig.json --outDir ../../domains/jellyfin/dist
docker cp domains/jellyfin/dist/. lifehub-backend:/app/domains/jellyfin/dist/
docker restart lifehub-backend
```

**Dockerfile:** Pre-built (kopiert `.next` vom Host) — kein Build inside Docker nötig (umgeht pnpm Workspace-Resolution-Probleme)
