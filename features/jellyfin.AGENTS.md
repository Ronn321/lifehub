# jellyfin.AGENTS.md

# LifeHub — `jellyfin` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Jellyfin-Integration als primäre Mediathek-Backend (Filme, Serien, Doku, Musik). Netflix-/Plex-/Jellyfin-ähnliche UI: Poster, Staffeln, Folgen, Watchstate-Sync, Watchlist, Trailer. **Phase 5.**

Musik-Subdomain (v0.3 aktiv): Spotify-inspirierter Desktop-Musikplayer mit Jellyfin als Backend. Eigene 13-Datei-Spezifikation unter `docs/domains/jellyfin/music/`. Siehe `docs/reviews/music_domain_review.md` für aktuellen Review-Status.

## 2. Scope

- Schema `jellyfin`: `jellyfin_servers`, `jellyfin_libraries`, `jellyfin_items`, `jellyfin_watchlists`, `jellyfin_watchlist_items`
- Jellyfin-API-Adapter (`/Users`, `/Items`, `/Sessions`, `/Audio`, `/Playlists`)
- Library-Sync (initial full, danach inkrementell via `LastModified`)
- Watchstate bidirektional (User pausiert in Jellyfin → LifeHub sieht Resume-Marker)
- **Watchstate-Toggles laufen gegen die Jellyfin-API** (`POST/DELETE /Users/{userId}/PlayedItems/{id}`) — NIE gegen LifeHub-DB-`jellyfin_items` (externe Jellyfin-IDs ≠ DB-uuids; die DB-basierte `toggleWatched` existiert nur noch für die Legacy-Route `POST /jellyfin/items/:id/toggle-watched`)
- Favoriten via Jellyfin `FavoriteItems` (POST/DELETE); Status via `UserData.IsFavorite` (Detail-Fields müssen `UserData` enthalten)
- **Custom Watchlists** (LifeHub-eigen, Migration `0018`): CRUD unter `/jellyfin/servers/:serverId/watchlists`, Items per external Jellyfin-ID + Name/Type-Snapshot; Detail-Fields müssen `SeasonId,SeriesId,SeriesName` enthalten (Episode-Navigation + Auto-Advance)
- Trailer via YouTube-Embed (gleiche Sanitisierung wie `projects`)
- Fallback: direkter NAS-Scan (Plex-kompatible Struktur), falls kein Jellyfin
- **Musik-Subdomain:** Audio-Streaming (`/Audio/{id}/stream`), Playback-Reporting (`/Sessions/Playing`), Playlisten, Genres, Favoriten, Search — eigene Spec unter `docs/domains/jellyfin/music/`

## 3. Dependencies

- Spec: `jellyfin.feature.md`
- DB: `DATABASE_SCHEMA.md` §16
- Architektur: `ARCHITECTURE.md` §4.14
- Stack: `TECH_STACK.md` §2.8 (Leaflet-Maps, falls Geo-Tagging), `docs/DOCKER_COMPOSE_PRODUCTION.md` §5 (Jellyfin-Profil)
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users`, `media` (für Cover-Poster), `search` (für globale Mediathek-Suche)

## 4. Work Guidance

- Jellyfin-API-Token verschlüsselt speichern (in `jellyfin_servers.api_key` Spalte, Anwendung verschlüsselt at rest).
- Sync-Worker: alle 15 min inkrementell, manueller Full-Sync nur per Admin-Button.
- Cover-/Backdrop-URLs direkt von Jellyfin (`/Items/{id}/Images/Backdrop`), nicht selbst hosten.
- Watchstate-Conflict: Jellyfin gewinnt (Server of Record).
- Player-Integration: HLS-Stream direkt von Jellyfin, in LifeHub-UI nur Wrapper.

## 5. Verification

- [ ] Migration idempotent.
- [ ] Library-Sync: 500 Filme, 30 Serien (insgesamt 2000 Episoden) in < 5 min.
- [ ] Watchstate: in Jellyfin pausiert → in LifeHub Resume-Marker sichtbar (Round-Trip < 30s).
- [ ] Mediathek-UI: Poster-Grid, Staffel-Picker, Trailer-Embed.
- [ ] Fallback ohne Jellyfin: direkter NAS-Scan zeigt Plex-Struktur.
- [ ] Permission + Audit + Events.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
