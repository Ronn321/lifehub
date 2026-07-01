# Jellyfin Fixes — Final Plan (kompakt)

## Root Cause gefunden & gefixt
- **P2/P6**: `getAlbums()` nutzte `ParentId=${artistId}` → FALSCH für Jellyfin API
- **Fix**: `&ArtistIds=${artistId}` hinzugefügt in `jellyfin.service.ts:224`

## Implementierungs-Reihenfolge

### Phase 1: Backend Bugfix (1 Datei) ✅
- `jellyfin.service.ts` — `ArtistIds` Parameter

### Phase 2: FolderBrowser (2 Dateien)
- `page.tsx` — `FolderBrowser` Komponente für movies/homevideos/photos
- Ersetzt `ItemsTab` Fallback im `LibraryBrowser` dispatcher
- Nutzt existierenden `/items/:id/children` Endpoint

### Phase 3: Frontend Mini-Fixes (2 Dateien)
- Video-Player: Dynamische API-URL statt hardcoded Port
- Photo-Lightbox: Bild-Vollansicht für photo items

### Phase 4: Build + Verifikation
- Backend Build + Restart
- Frontend Build + Restart
- Browser-Test aller Library-Typen
