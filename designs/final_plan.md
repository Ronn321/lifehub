# Jellyfin Frontend Redesign — Final Implementation Plan

## Basierend auf
- DS-Entwurf (`jellyfin_ds_v1.md`)
- Mimo-Entwurf (`jellyfin_mimo_v1.md`)
- DS-Kritik an Mimo (`ds_critique_of_mimo.md`)
- Mimo-Kritik an DS (`mimo_critique_of_ds.md`)

## Umfang
**NUR** `apps/frontend/src/app/(dashboard)/jellyfin/page.tsx` ändern.
Keine Backend-Änderungen (bestehende API-Endpoints nutzen).
Keine neuen Abhängigkeiten (kein Framer Motion, keine neuen Pakete).

## Änderungen

### 1. LibrariesTab — Kachel-Design
- Jede Bibliothek als Karte mit Typ-spezifischem Icon + Farbakzent
- Hover: leichter Lift-Effekt (translateY + shadow)
- Responsive Grid: 2/3/4/5 cols
- Klick → ItemsTab öffnen

### 2. ItemsTab — Poster-Grid
- Raster mit `aspect-[2/3]` Kacheln (Poster-Format)
- **Pro Kachel**: Poster-Fallback (Typ-Icon) + Titel + Typ-Label + Watched-Badge
- Hover: Play-Button-Overlay + Zoom-Effekt (scale)
- Responsive: 2/3/4/5/6 cols
- Filter: "Alle" / "Ungesehen" / "Gesehen" + Suchfeld
- Loading: Skeleton-Grid (animierte Placeholder-Kacheln)
- Empty: "Keine Medien" + Sync-Hinweis
- Error: Fehlermeldung + Retry-Button

### 3. Sync-Status
- Anzuige unter dem Bibliotheken-Titel: "Zuletzt synchronisiert: vor X Minuten"
- Grün/gelb/rot je nach Aktualität
- Button: "Jetzt synchronisieren"

### 4. Verbesserungen bestehender Komponenten
- **ServersTab**: unverändert (funktioniert)
- **AddServerDialog**: unverändert
- **MediaPlayer**: unverändert (funktioniert)
- **Keine** neuen API-Endpoints nötig

### 5. Nicht umgesetzt (Phase 2)
- Image-Proxy (Jellyfin-Poster laden) → erfordert Backend-Änderung
- Paginierung → bei >200 Items
- Framer Motion Transitionen
- Item-Detail-Ansicht
- Token in Query-String (bleibt, da `<video>`-Tag keine custom Header unterstützt)

## Komponenten-Struktur (alle in page.tsx)
1. `LibrariesTab` — Kachel-Grid für Bibliotheken
2. `LibraryCard` — Einzelne Bibliotheks-Kachel
3. `ItemsTab` — Poster-Grid + Filter + Sync-Status
4. `ItemCard` — Einzelne Poster-Kachel
5. `MediaPlayer` — unverändert
6. `SkeletonGrid` — Loading-Placeholder
7. `SyncStatusBadge` — Sync-Indikator
8. `ItemToolbar` — Filter + Suche

## Datenfluss (unverändert)
- `GET /jellyfin/libraries` → LibrariesTab
- `GET /jellyfin/items?libraryId=X` → ItemsTab
- `POST /jellyfin/items/:id/toggle-watched` → Watched-Toggle
- `GET /jellyfin/items/:id/stream?token=Y` → MediaPlayer
- Query-Keys: `['jellyfin-libraries']`, `['jellyfin-items', libraryId]`
