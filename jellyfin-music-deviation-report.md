# Jellyfin Backend — Music Integration Deviation Report

**Generated:** 2026-07-09
**Scope:** Backend (domains/jellyfin) + Frontend API hooks (apps/frontend/src/lib/music-api.ts + jellyfin-media-api.ts)
**Spec Reference:** docs/domains/jellyfin/music/spotify_*.md + IMPLEMENTATION_PLAN_V0.2.md

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Implemented | Fully matches spec |
| ⚠️ Partial | Implemented but with deviations |
| ❌ Missing | Not implemented at all |
| 🔴 Critical | Will cause runtime errors or security issues |

---

## A. Endpoint Deviations

### A-001: Artists endpoint path

| Field | Value |
|-------|-------|
| **File** | `jellyfin.controller.ts:98` |
| **Spec requirement** | `GET /jellyfin/servers/:id/artists` |
| **Implementation status** | ⚠️ Partial |
| **Description** | Artists endpoint is implemented at `GET /jellyfin/artists?serverId=` (flat path with query param) instead of `GET /jellyfin/servers/:id/artists` (nested under server path). The frontend hook `useArtists()` on line 223 of `music-api.ts` calls the flat-query-param variant, so it's functionally consistent internally — but deviates from the documented API contract. |
| **Priority** | Low |

### A-002: Albums endpoint path

| Field | Value |
|-------|-------|
| **File** | `jellyfin.controller.ts:105` |
| **Spec requirement** | `GET /jellyfin/servers/:id/albums?artistId=...` |
| **Implementation status** | ⚠️ Partial |
| **Description** | Albums-by-artist endpoint is `GET /jellyfin/albums?serverId=&artistId=` (flat path) instead of `GET /jellyfin/servers/:id/albums?artistId=`. However, the `/albums/recent` and `/albums/:aid/songs` sub-routes are correctly nested under `servers/:serverId/`. |
| **Priority** | Low |

### A-003: Server-wide top songs endpoint missing

| Field | Value |
|-------|-------|
| **File** | `jellyfin.controller.ts` (entire file) |
| **Spec requirement** | `GET /jellyfin/servers/:id/top` — Server-wide top/most-played songs |
| **Implementation status** | ❌ Missing |
| **Description** | The spec calls for a server-wide top songs endpoint (most played overall). Only a per-artist endpoint exists at `GET /jellyfin/servers/:serverId/artists/:artistId/top-songs` (`getTopSongs()` in service line 696). There is no server-wide `/top` endpoint. The per-artist `top-songs` is additional functionality not in the original spec endpoint list. |
| **Priority** | Medium |

### A-004: Playlist endpoints — completely missing

| Field | Value |
|-------|-------|
| **File** | `jellyfin.controller.ts`, `jellyfin.service.ts` |
| **Spec requirement** | `GET /jellyfin/servers/:id/playlists` — List Jellyfin playlists |
| **Implementation status** | ❌ Missing |
| **Description** | No playlist listing endpoint exists in the backend. The frontend `music-api.ts` has `usePlaylists()` hook (line 330) calling `GET /jellyfin/servers/${serverId}/playlists` but there is no matching controller or service method. All playlist-related API calls will return 404. This is documented as a known limitation in `IMPLEMENTATION_PLAN_V0.2.md` §1: "Kein Jellyfin-Playlist-Endpoint im Backend vorhanden". |
| **Priority** | High |

### A-005: Single playlist endpoint missing

| Field | Value |
|-------|-------|
| **File** | `jellyfin.controller.ts`, `jellyfin.service.ts` |
| **Spec requirement** | `GET /jellyfin/servers/:id/playlists/:pid` — Single playlist details |
| **Implementation status** | ❌ Missing |
| **Description** | Frontend `usePlaylist()` hook (line 341) calls this but no backend handler exists. |
| **Priority** | High |

### A-006: Playlist items endpoint missing

| Field | Value |
|-------|-------|
| **File** | `jellyfin.controller.ts`, `jellyfin.service.ts` |
| **Spec requirement** | `GET /jellyfin/servers/:id/playlists/:pid/items` — Songs in a playlist |
| **Implementation status** | ❌ Missing |
| **Description** | Frontend `usePlaylistItems()` hook (line 353) calls this but no backend handler exists. |
| **Priority** | High |

### A-007: Playlist CRUD endpoints missing

| Field | Value |
|-------|-------|
| **File** | `jellyfin.controller.ts`, `jellyfin.service.ts` |
| **Spec requirement** | `POST /Playlists` (create), `POST /Playlists/:id/Items` (add song), `DELETE /Playlists/:id/Items` (remove song), `POST /Playlists/:id/Items/{pos}` (reorder) |
| **Implementation status** | ❌ Missing |
| **Description** | None of the playlist mutation endpoints are implemented. The spec in `spotify_playlist_page.md` (lines 297-301) documents these as required Jellyfin integration endpoints. |
| **Priority** | High |

### A-008: Playback reporting missing

| Field | Value |
|-------|-------|
| **File** | Entire jellyfin domain |
| **Spec requirement** | `POST /Sessions/Playing`, `POST /Sessions/Playing/Progress`, `POST /Sessions/Playing/Stopped` |
| **Implementation status** | ❌ Missing |
| **Description** | The spec in `spotify_player.md` (lines 301-305) requires playback reporting to Jellyfin. No implementation exists anywhere in the backend. This means Jellyfin play counts, recently played, and resume positions will never be updated by LifeHub. |
| **Priority** | High |

---

## B. Route Collisions (Critical Runtime Issues)

### B-001: Duplicate search routes

| Field | Value |
|-------|-------|
| **File** | `jellyfin.controller.ts:136` and `jellyfin.controller.ts:265` |
| **Spec requirement** | Unique routes per endpoint |
| **Implementation status** | 🔴 Critical |
| **Description** | Two controller methods share the exact same HTTP method and route: `@Get('servers/:serverId/search')`. Both `searchMusic()` (line 136) and `searchMedia()` (line 265) register for `GET /jellyfin/servers/:serverId/search`. NestJS will only register the first one encountered (likely `searchMusic()`), making the media search completely unreachable. The second search route should be under a distinct path like `servers/:serverId/media/search`. |
| **Priority** | Critical |

---

## C. Image Proxy Deviations

### C-001: Image proxy route differs from spec

| Field | Value |
|-------|-------|
| **File** | `jellyfin-stream.controller.ts:220` |
| **Spec requirement** | `GET /jellyfin/items/:id/image` |
| **Implementation status** | ⚠️ Partial |
| **Description** | Spec defines the image endpoint as `GET /jellyfin/items/:id/image` but it's implemented as `GET /jellyfin/servers/:serverId/items/:externalId/image`. The serverId parameter is required, making the endpoint incompatible with the spec path. The frontend helpers (`getCoverUrl()` in music-api.ts:110 and `getImageUrl` in jellyfin-media-api.ts:67) both use the longer path, so the frontend is internally consistent. |
| **Priority** | Low |

### C-002: Image proxy parameter validation

| Field | Value |
|-------|-------|
| **File** | `jellyfin-stream.controller.ts:239` |
| **Spec requirement** | Image proxy should use correct Jellyfin parameters (width/height, NOT fillWidth/fillHeight; include UserId) |
| **Implementation status** | ✅ Implemented |
| **Description** | The service correctly uses `width=${width}&height=${height}&quality=90&UserId=${userId}` (line 508). Does NOT use `fillWidth`/`fillHeight`. Was fixed as documented in IMPLEMENTATION_PLAN_V0.2.md §8. |
| **Priority** | — |

---

## D. Stream Proxy

### D-001: Range request handling

| Field | Value |
|-------|-------|
| **File** | `jellyfin-stream.controller.ts`, `jellyfin.service.ts` |
| **Spec requirement** | Stream proxy should handle Range requests correctly (forward to Jellyfin, return 206 partial content) |
| **Implementation status** | ✅ Implemented |
| **Description** | The Range header is forwarded from the client request to Jellyfin in both `getExternalItemStream()` (line 274) and `getItemStream()` (line 339). The response passes through Jellyfin's headers including Content-Range. Status code 206 is accepted as valid (line 303: `jellyfinRes.status !== 206`). |
| **Priority** | — |

### D-002: External stream audio container hardcoded to mp3

| Field | Value |
|-------|-------|
| **File** | `jellyfin.service.ts:294` |
| **Spec requirement** | Stream should support multiple audio formats (FLAC, ALAC, AAC, MP3, OGG, WAV, Opus) as documented in spotify_player.md |
| **Implementation status** | ⚠️ Partial |
| **Description** | The `getExternalItemStream()` method hardcodes `Container=mp3` (line 294). This forces transcoding even for natively supported formats. The spec (spotify_player.md §Audioformate) lists FLAC, OGG, OPUS, AAC, WAV as preferred formats. No container negotiation is implemented. The `getItemStream()` method (line 358) similarly hardcodes `Container=mp4` for the general case. |
| **Priority** | Medium |

---

## E. "Default" Server Fallback

### E-001: UUID fix for default server

| Field | Value |
|-------|-------|
| **File** | `jellyfin.service.ts:19-34` |
| **Spec requirement** | Default server fallback should handle "default" as serverId without crashing on UUID lookup |
| **Implementation status** | ✅ Implemented |
| **Description** | `findServerOrFallback()` correctly skips DB lookup when `serverId === 'default'` and returns a hardcoded server object with `defaultUrl` and `defaultApiKey`. Documented in IMPLEMENTATION_PLAN_V0.2.md §9. |
| **Priority** | — |

### E-002: Hardcoded default credentials

| Field | Value |
|-------|-------|
| **File** | `jellyfin.service.ts:12-13` |
| **Spec requirement** | Credentials should come from config/env, not hardcoded source |
| **Implementation status** | ⚠️ Partial |
| **Description** | Default URL `http://192.168.31.35:8096` and API key `0fde01a7adda4a40a3281c1cd3af1c5d` are hardcoded as fallbacks. The env vars `JELLYFIN_URL` and `JELLYFIN_API_KEY` are read but these hardcoded values leak internal network IP and API credentials. The API key is also visible in query strings in stream URLs (e.g., line 229, 294, 358). |
| **Priority** | Medium |

---

## F. Favorite Toggle

### F-001: Favorite toggle implementation

| Field | Value |
|-------|-------|
| **File** | `jellyfin.service.ts:774-801`, `jellyfin.controller.ts:277` |
| **Spec requirement** | `POST /Users/:userId/Items/:id/Favorite` (Jellyfin API) |
| **Implementation status** | ✅ Implemented |
| **Description** | The service correctly implements favorite toggling at `POST /jellyfin/servers/:serverId/items/:externalId/favorite`. Uses Jellyfin's `/Users/{userId}/FavoriteItems/{id}` with POST (add) / DELETE (remove) depending on current state. The frontend `useToggleFavorite()` hook (line 391) mirrors this. Note: the Jellyfin API path used is `/FavoriteItems/` not `/Items/.../Favorite` as described in the spec, but both are valid Jellyfin endpoints. |
| **Priority** | — |

---

## G. Frontend API Hooks Analysis

### G-001: Playlist hooks will 404

| Field | Value |
|-------|-------|
| **File** | `music-api.ts:330-360` |
| **Spec requirement** | Frontend hooks should have matching backend endpoints |
| **Implementation status** | ❌ Missing |
| **Description** | `usePlaylists()`, `usePlaylist()`, and `usePlaylistItems()` all call `/jellyfin/servers/${serverId}/playlists...` endpoints that do not exist in the backend. These hooks are dead code — they will always return 404 errors. |
| **Priority** | High |

### G-002: No hook for server-wide top songs

| Field | Value |
|-------|-------|
| **File** | `music-api.ts` |
| **Spec requirement** | `GET /jellyfin/servers/:id/top` hook should exist |
| **Implementation status** | ❌ Missing |
| **Description** | Only a per-artist top-songs hook exists (`useTopSongs()` at line 315). No server-wide top songs hook. |
| **Priority** | Medium |

### G-003: Frontend/media-api overlap

| Field | Value |
|-------|-------|
| **File** | `jellyfin-media-api.ts` vs `music-api.ts` |
| **Spec requirement** | Clean separation of media (video) and music (audio) API concerns |
| **Implementation status** | ⚠️ Partial |
| **Description** | `jellyfin-media-api.ts` duplicates some helper functions like `getStreamUrl()` (music-api.ts:122 vs jellyfin-media-api.ts:83) and `getImageUrl`-style functions. The media-api has its own `toggleFavorite()` (line 157) that duplicates the music-api's hook. These are separate files for media vs music concerns but share significant code. The media-api doesn't use hooks/useQuery patterns — it uses direct async functions, while music-api uses TanStack Query hooks. |
| **Priority** | Low |

---

## H. Security Issues

### H-001: API key in query strings

| Field | Value |
|-------|-------|
| **File** | `jellyfin.service.ts:229,294,358` |
| **Spec requirement** | API tokens should not be exposed in URLs (logs, referrer headers, browser history) |
| **Implementation status** | 🔴 Critical |
| **Description** | The Jellyfin API key is passed as `api_key=${server.apiKey}` in query strings for stream URLs (line 229 for subtitles, line 294 for audio stream). The `Authorization: MediaBrowser Token=...` header is also used (line 272, 297), which is the secure method. The query string duplication exposes the API key in server logs and browser history. |
| **Priority** | Critical |

### H-002: Stream controller auth token in query string

| Field | Value |
|-------|-------|
| **File** | `jellyfin-stream.controller.ts` |
| **Spec requirement** | Auth tokens should use Authorization header (Bearer), not query parameters |
| **Implementation status** | ⚠️ Partial |
| **Description** | The stream controller extracts tokens from both `req.query.token` and `Authorization: Bearer` header (line 333-338). While supporting both methods, the query-string token (`?token=...`) is used extensively by the frontend (`getStreamUrl()` at music-api.ts:127) and the HLS segment proxy (line 192: `tokenParam`). Query-string tokens are exposed in browser history, server access logs, and referrer headers. |
| **Priority** | High |

### H-003: No Rate Limiting

| Field | Value |
|-------|-------|
| **File** | All controllers |
| **Spec requirement** | Standard security hardening |
| **Implementation status** | ⚠️ Partial |
| **Description** | No rate limiting is applied to any Jellyfin proxy endpoint. The stream proxy and image proxy endpoints are unauthenticated (they use manual token verification instead of guards) and could be abused for amplification attacks against the Jellyfin server. |
| **Priority** | Low |

---

## I. Additional Issues

### I-001: `getJellyfinUserId()` caches across servers

| Field | Value |
|-------|-------|
| **File** | `jellyfin.service.ts:803-815` |
| **Spec requirement** | User ID should be per-server, not globally cached |
| **Implementation status** | ⚠️ Partial |
| **Description** | The `cachedUserId` is a single string cached at the class level. If a user has multiple Jellyfin servers with different users, the second server's lookup will return the first server's user ID, which may not exist on the second server. The cache is never invalidated. |
| **Priority** | Medium |

### I-002: Missing fields in sync (composers, genres, track numbers)

| Field | Value |
|-------|-------|
| **File** | `jellyfin.service.ts:567-577` |
| **Spec requirement** | Music items should include composers, genres, disc/track numbers (spotify_library.md Song data model) |
| **Implementation status** | ⚠️ Partial |
| **Description** | The `fetchItemsFromJellyfin()` method only requests `Fields=Path`. It does not request `Genres,AudioInfo,ParentIndexNumber,IndexNumber,MediaSources` which are needed for the full Song data model defined in spotify_library.md. However, the live browsing methods (`fetchJellyfinChildren`, `browseJellyfinLibrary`) do request more fields. The sync path stores minimal data; rich metadata is fetched via `refresh=true` or direct Jellyfin API calls. |
| **Priority** | Low |

### I-003: No error handling for missing Jellyfin userId

| Field | Value |
|-------|-------|
| **File** | `jellyfin.service.ts:804-815` |
| **Spec requirement** | Graceful error handling |
| **Implementation status** | ⚠️ Partial |
| **Description** | If `/Users` returns an empty array (no user configured on Jellyfin), the method throws a generic `Error('No Jellyfin user found')`. This is never caught at the controller level — every music endpoint will return a 500 error until a user exists on the Jellyfin server. |
| **Priority** | Medium |

### I-004: Music search uses wrong fields parameter

| Field | Value |
|-------|-------|
| **File** | `jellyfin.service.ts:614` |
| **Spec requirement** | Valid Jellyfin field parameters |
| **Implementation status** | ⚠️ Minor |
| **Description** | The searchMusic method uses `Fields=BasicSyncs,AudioInfo,PrimaryImageAspectRatio`. `BasicSyncs` is not a valid Jellyfin field — the correct parameter is `BasicSyncInfo`. This will be silently ignored by Jellyfin but indicates a typo. |
| **Priority** | Low |

---

## J. Summary Statistics

| Category | Count |
|----------|-------|
| ✅ Fully Implemented | 6 |
| ⚠️ Partial Implementation | 11 |
| ❌ Missing Implementation | 8 |
| 🔴 Critical Issues | 2 (Route collision, API key in query string) |
| High Priority | 6 |
| Medium Priority | 5 |
| Low Priority | 6 |

### Most Critical Action Items

1. **Fix duplicate search routes** (B-001) — `searchMedia()` at route `servers/:serverId/search` is unreachable due to `searchMusic()` using the same route
2. **Remove API key from query strings** (H-001) — Switch to header-only auth in stream URLs
3. **Implement playlist endpoints** (A-004 through A-007) — 4 missing endpoints for playlist functionality, frontend hooks already call them but they 404
4. **Implement playback reporting** (A-008) — Without this, Jellyfin play counts and recently-played lists are never updated
5. **Add server-wide top songs endpoint** (A-003) — The spec requires `/top`, only per-artist exists
