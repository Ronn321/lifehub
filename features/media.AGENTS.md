# media.AGENTS.md

# LifeHub — `media` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Unified-Media-System für Fotos, Videos, Alben. NAS-Indexierung, Timeline, Karte (Leaflet/OSM), 3D-Globe (Three.js). EXIF-Extraktion, GPS-Tagging, Thumbnail-Generierung, Blurhash, Perceptual-Hash für Duplikate. **Phase 1, zweite Domain nach `users`.**

## 2. Scope

- Schema `media`: `media_sources`, `albums`, `media_files`, `media_tags`
- Upload (multipart, chunked), EXIF/GPS-Extraktion, Thumbnail-Generierung (sharp, WebP+AVIF)
- Ansichten: Galerie (Masonry), Album, Timeline (Jahr/Monat/Tag), Karte, Globe
- Lightbox (Tastatur J/K/Enter), Drag & Drop, Multi-Upload mit Progress
- Album-Logik (Urlaube, Ereignisse, Personen — Personen-Erkennung Phase V3+)
- Emittiert Events: `MediaCreated`, `MediaUpdated`, `MediaDeleted`, `AlbumCreated`

## 3. Dependencies

- Spec: `media.feature.md`
- DB: `DATABASE_SCHEMA.md` §5
- Architektur: `ARCHITECTURE.md` §4.3, §6 (Storage-Abstraktion), §9 (NAS-Mounts)
- Stack: `TECH_STACK.md` §2.8 (Leaflet, Three.js), §2.9 (sharp, blurhash), §3.4 (Upload)
- Status: `docs/DOMAIN_STATUS.md` (Data Core)
- Vorgänger: `users` muss `DONE` sein

## 4. Work Guidance

- Storage IMMER über `StorageService`-Interface (`shared/storage/`), niemals direkt auf Filesystem.
- BullMQ-Worker für EXIF/Thumbnails (async), API-Endpoint bleibt responsiv.
- Cross-Schema FK nur auf `public.users(id)` für `owner_id`. Album-/Tag-Referenzen bleiben innerhalb `media`-Schema.
- Perceptual-Hash vor Speicherung berechnen, um Duplikate zu erkennen.
- Globe-View in MVP optional — UI-Code dafür vorbereiten, Rendering kann in V1 fertig werden.
- Performance-Ziel: 1000 Fotos Galerie rendert < 2.5s LCP, infinite-scroll ohne Ruckeln.
- Video-Tiles (Galerie + Album) nutzen `VideoPreviewTile` (`components/VideoPreviewTile.tsx`): Standbild aus der Video-Mitte (seek bei `loadedMetadata`), Hover spielt 5s-Snippet aus der Mitte in Schleife (`onTimeUpdate`-Window), Verlassen → zurück zum Standbild. Nutzt den Range-fähigen Stream-Endpoint. Optionales `thumbnail`-Prop (ffmpeg-Frame) wird als Sofort-Bild gezeigt; `onMetadataLoaded`/`registerVideo` melden Bereitschaft an die Lazy-Loading-Queue.
- Galerie-Pagination: `GET /media/files?sourceId=&favorite=&limit=&offset=` liefert `{ items, total }` (favorite-Filter server-seitig, 2026-08 implementiert). GalleryTab nutzt Seiten (50/100/200, localStorage `lifehub-media-page-size`), `placeholderData` (keepPreviousData) für flüssige Seitenwechsel, Prefetch von `page±1` via `queryClient.prefetchQuery`.
- Lazy-Loading: `LazyMediaTile` (IntersectionObserver + sequentielle Aktivierungs-Queue `activatedUpTo` von oben nach unten, 4s-Timeout-Fallback). Nach komplettem Seiten-Load (`pageReady`) startet der Video-Warmup: alle Videos der Seite in DOM-Reihenfolge, ~120ms Abstand, seek zur Mitte + play/pause (Puffer warm für Hover-Playback).
- Lightbox-Info-Bar (Titel, Maße, Datum, Favorit): bei VIDEOS oben (`top-0`, `pointer-events-none`, nur Button klickbar) — überdeckt nie die Player-Controls; bei Bildern unten.

## 5. Verification

- [ ] Migration idempotent, alle 4 Tabellen + Indizes korrekt.
- [ ] 1000-Foto-Bulk-Upload in < 10 min (Test mit Fixture-Set).
- [ ] Timeline-Endpoint liefert korrekte Aggregationen (Year/Month).
- [ ] Karte zeigt alle GPS-getaggten Items korrekt (Leaflet-Cluster).
- [ ] Thumbnail-Generierung läuft im Worker, nicht im Request-Thread.
- [ ] EXIF-Test-Fixture (Foto mit GPS, EXIF, Orientation) korrekt geparst.
- [ ] Permission-Tests: nur Owner kann `update`/`delete`; `share` für Familien-Rolle.
- [ ] Audit-Trigger auf `media.media_files` aktiv.
- [ ] Galerie + Lightbox + Keyboard-Nav im Playwright-E2E grün.
- [ ] Performance: Lighthouse ≥ 90, LCP < 2.5s bei 1000 Items.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.

## 6. Status

Siehe `docs/DOMAIN_STATUS.md` (Data Core). Cross-Referenz: `travel` und `projects` hängen von `media` ab.

## 7. Child DOX Index

Keine. Sub-Domains (z.B. `media/face-recognition/`) folgen in V3+.
