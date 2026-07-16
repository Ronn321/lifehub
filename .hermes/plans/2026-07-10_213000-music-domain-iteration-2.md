# Jellyfin Music Domain — Iteration 2: Functional Features

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Close all remaining functional gaps between the Music Domain specification and implementation — focus on features users interact with, not security internals.

**Architecture:** Next.js 14 frontend (App Router) + NestJS backend (Jellyfin domain). Zustand for player state, TanStack Query for server state. Jellyfin as media backend via proxied REST API.

**Tech Stack:** TypeScript strict, Tailwind CSS, @tanstack/react-virtual, @dnd-kit, Zustand + persist, Lucide icons

---

## Current State (after Iteration 1)

- 8 commits (`9b8be15` → `1ee7585`), ~2000 lines changed
- 9 Critical issues fixed, 30+ High issues fixed
- Typecheck: 0 errors
- All 13 spec files cleaned and deduplicated

## Open Functional Gaps (from review)

| ID | Feature | Priority | Area |
|----|---------|----------|------|
| P-006 | Gapless Playback / Preload next track | High | Player |
| G-009 | Lyrics: Backend endpoint + frontend wiring | High | Player/Backend |
| G-015 | Playlist CRUD: Create, Add, Remove, Delete | High | Backend/Frontend |
| L-009 | Skeleton-Shimmer loading states for Library | Medium | Library |
| P-016 | Color Extraction utility (centralized Canvas API) | Medium | NowPlaying/Detail |
| G-013 | Home: "Continue Listening" section | Medium | Home |
| P-002 | Store: Undo/Redo stack | Low | Player |
| S-005 | Search: Filter tabs (Alle/Musik/Podcasts) | Low | Search |

---

## Task 1: Playlist Create Dialog + Backend Create Endpoint

**Objective:** Users can create a new Jellyfin playlist from the sidebar.

**Files:**
- Modify: `domains/jellyfin/src/api/jellyfin.controller.ts`
- Modify: `domains/jellyfin/src/services/jellyfin.service.ts`
- Modify: `apps/frontend/src/lib/music-api.ts`
- Create: `apps/frontend/src/components/music/playlist/CreatePlaylistDialog.tsx`
- Modify: `apps/frontend/src/components/music/sidebar/MusicSidebar.tsx`

**Step 1: Backend — Add POST create playlist endpoint**

In `jellyfin.controller.ts`, add after line ~249 (after getPlaylistItems):
```typescript
@Post('servers/:serverId/playlists')
@RequirePermission('jellyfin', 'update')
async createPlaylist(
  @CurrentUser() user: JwtPayload,
  @Param('serverId') serverId: string,
  @Body() body: { name: string; songIds?: string[] },
) {
  return this.jellyfin.createPlaylist(user.sub, serverId, body.name, body.songIds);
}
```

In `jellyfin.service.ts`, add method:
```typescript
async createPlaylist(userId: string, serverId: string, name: string, songIds?: string[]) {
  const server = await this.findServerOrFallback(serverId);
  const jellyfinUserId = await this.getJellyfinUserId(userId, server);
  const url = `${server.url}/Playlists?name=${encodeURIComponent(name)}&api_key=${server.apiKey}`;
  const body: Record<string, unknown> = { UserId: jellyfinUserId };
  if (songIds && songIds.length > 0) {
    body.Ids = songIds.join(',');
  }
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Create playlist failed: ${res.status}`);
  return res.json();
}
```

**Step 2: Frontend — API hook**

In `music-api.ts`, add:
```typescript
export function useCreatePlaylist() {
  return useCallback(
    async (serverId: string, name: string, songIds?: string[]): Promise<void> => {
      await api.post(`/jellyfin/servers/${serverId}/playlists`, { name, songIds });
    },
    [],
  );
}
```

**Step 3: Frontend — CreatePlaylistDialog component**

Create `CreatePlaylistDialog.tsx` — a modal dialog with:
- Input field for playlist name
- Optional: song count if songs are pre-selected
- "Erstellen" + "Abbrechen" buttons
- On submit: call useCreatePlaylist, invalidate `['music-playlists']` query, close dialog

**Step 4: Frontend — Wire into MusicSidebar**

In `MusicSidebar.tsx`, the `onCreatePlaylist` callback should open the `CreatePlaylistDialog`. Add dialog state and render.

**Step 5: Verify**

Run: `npx tsc --noEmit --project apps/frontend/tsconfig.json`
Expected: 0 errors

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(jellyfin-music): playlist create dialog + backend endpoint"
```

---

## Task 2: Playlist Add/Remove Songs + Delete Playlist

**Objective:** Users can add songs to playlists and remove playlists.

**Files:**
- Modify: `domains/jellyfin/src/api/jellyfin.controller.ts`
- Modify: `domains/jellyfin/src/services/jellyfin.service.ts`
- Modify: `apps/frontend/src/lib/music-api.ts`
- Modify: `apps/frontend/src/components/music/shared/ContextMenu.tsx` (Add to Playlist submenu)

**Step 1: Backend — Add endpoints**

In `jellyfin.controller.ts`:
```typescript
@Post('servers/:serverId/playlists/:playlistId/items')
async addToPlaylist(@CurrentUser() user, @Param('serverId') sid, @Param('playlistId') pid, @Body() body: { songIds: string[] }) {
  return this.jellyfin.addToPlaylist(user.sub, sid, pid, body.songIds);
}

@Delete('servers/:serverId/playlists/:playlistId/items/:songId')
async removeFromPlaylist(@CurrentUser() user, @Param() params) {
  return this.jellyfin.removeFromPlaylist(user.sub, params.serverId, params.playlistId, params.songId);
}

@Delete('servers/:serverId/playlists/:playlistId')
async deletePlaylist(@CurrentUser() user, @Param() params) {
  return this.jellyfin.deletePlaylist(user.sub, params.serverId, params.playlistId);
}
```

In `jellyfin.service.ts`, add 3 methods using Jellyfin API:
- `addToPlaylist`: `POST /Playlists/{pid}/Items?ids=xxx,yyy&api_key=xxx`
- `removeFromPlaylist`: `DELETE /Playlists/{pid}/Items?entryIds=xxx&api_key=xxx`
- `deletePlaylist`: `DELETE /Items/{pid}?api_key=xxx`

**Step 2: Frontend — API hooks**

In `music-api.ts`:
```typescript
export function useAddToPlaylist() { ... }
export function useRemoveFromPlaylist() { ... }
export function useDeletePlaylist() { ... }
```

**Step 3: Frontend — Context Menu "Add to Playlist" submenu**

In `ContextMenu.tsx`, enhance the "Zur Playlist hinzufügen" item to open a submenu showing available playlists (fetched via `usePlaylists`). Clicking a playlist adds the song.

**Step 4: Verify**

Run: `npx tsc --noEmit --project apps/frontend/tsconfig.json`

**Step 5: Commit**

```bash
git commit -m "feat(jellyfin-music): playlist add/remove/delete songs + context menu submenu"
```

---

## Task 3: Lyrics Backend Endpoint + Frontend Integration

**Objective:** Fetch and display lyrics for the current track.

**Files:**
- Modify: `domains/jellyfin/src/api/jellyfin.controller.ts`
- Modify: `domains/jellyfin/src/services/jellyfin.service.ts`
- Modify: `apps/frontend/src/lib/music-api.ts`
- Modify: `apps/frontend/src/components/music/player/LyricsOverlay.tsx`
- Modify: `apps/frontend/src/components/music/nowplaying/NowPlayingView.tsx`

**Step 1: Backend — Lyrics endpoint**

In `jellyfin.controller.ts`:
```typescript
@Get('servers/:serverId/items/:itemId/lyrics')
async getLyrics(@CurrentUser() user, @Param('serverId') sid, @Param('itemId') iid) {
  return this.jellyfin.getLyrics(user.sub, sid, iid);
}
```

In `jellyfin.service.ts`:
```typescript
async getLyrics(userId: string, serverId: string, itemId: string) {
  const server = await this.findServerOrFallback(serverId);
  // Try Jellyfin's built-in lyrics endpoint
  const url = `${server.url}/Audio/${itemId}/Lyrics?api_key=${server.apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return { lyrics: null, synced: false };
  const data = await res.json();
  // Parse LRC format or plain text
  return { lyrics: data, synced: !!data.SyncedLyrics };
}
```

**Step 2: Frontend — API hook + Lyrics display**

In `music-api.ts`, add `useLyrics(serverId, itemId)` hook.

In `LyricsOverlay.tsx`, wire the hook and display:
- Synced lyrics: highlight current line based on `position`
- Plain text: show full lyrics with auto-scroll
- No lyrics: show "Keine Lyrics verfügbar"

**Step 3: Verify + Commit**

---

## Task 4: Gapless Playback / Preload Next Track

**Objective:** Preload the next track when current track is >80% played, for seamless transitions.

**Files:**
- Modify: `apps/frontend/src/components/music/player/MusicPlayerWrapper.tsx`

**Step 1: Implement preload audio instance**

In `MusicPlayerWrapper.tsx`:
- Create a second `Audio()` instance (`preloadAudioRef`) alongside the main one
- When playback position > 80% of duration: set `preloadAudioRef.src = nextTrack.streamUrl`
- On track end (`ended` event): swap refs — preload becomes main, start new preload for next-next
- If shuffle/repeat changes, clear preload cache
- Cross-fade: simple 0ms instant switch (configurable later)

**Step 2: Verify + Commit**

---

## Task 5: Skeleton-Shimmer Loading States

**Objective:** Replace spinner-based loading with skeleton placeholders for all list views.

**Files:**
- Modify: `apps/frontend/src/components/music/shared/MusicCard.tsx` — enhance `MusicSkeleton`
- Create: `apps/frontend/src/components/music/shared/SongRowSkeleton.tsx`
- Modify: `apps/frontend/src/app/(dashboard)/jellyfin/music/tracks/page.tsx`
- Modify: `apps/frontend/src/app/(dashboard)/jellyfin/music/library/page.tsx`
- Modify: `apps/frontend/src/app/(dashboard)/jellyfin/music/search/page.tsx`

**Step 1: Create SongRowSkeleton**

16-row placeholder with pulsing animation:
```tsx
export function SongRowSkeleton({ rows = 16 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-2 animate-pulse">
          <div className="h-4 w-4 rounded bg-[var(--music-bg-card)]" />
          <div className="h-10 w-10 rounded bg-[var(--music-bg-card)]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-[var(--music-bg-card)]" />
            <div className="h-2 w-1/4 rounded bg-[var(--music-bg-card)]" />
          </div>
          <div className="h-3 w-16 rounded bg-[var(--music-bg-card)]" />
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Replace MusicLoader with SongRowSkeleton in tracks/library pages**

**Step 3: Verify + Commit**

---

## Task 6: Centralized Color Extraction Utility

**Objective:** Single reusable utility for extracting dominant color from album covers.

**Files:**
- Create: `apps/frontend/src/lib/color-extraction.ts`
- Modify: `apps/frontend/src/components/music/playlist/PlaylistHeader.tsx` (replace inline extraction)
- Modify: `apps/frontend/src/app/(dashboard)/jellyfin/music/album/[id]/page.tsx` (replace inline)
- Modify: `apps/frontend/src/components/music/nowplaying/NowPlayingView.tsx` (add gradient)

**Step 1: Create utility**

```typescript
const colorCache = new Map<string, [number, number, number]>();

export function extractDominantColor(imageUrl: string): Promise<[number, number, number]> {
  if (colorCache.has(imageUrl)) return Promise.resolve(colorCache.get(imageUrl)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50; canvas.height = 50;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0, 0, 50, 50).data;
      // Average color (simple but effective)
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i+1]; b += data[i+2]; count++;
      }
      const result: [number, number, number] = [Math.round(r/count), Math.round(g/count), Math.round(b/count)];
      colorCache.set(imageUrl, result);
      resolve(result);
    };
    img.onerror = () => resolve([30, 30, 30]); // fallback dark gray
    img.src = imageUrl;
  });
}

export function rgbToCss([r, g, b]: [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}
```

**Step 2: Refactor existing inline extraction in PlaylistHeader + album page**

**Step 3: Add dynamic gradient to NowPlayingView**

**Step 4: Verify + Commit**

---

## Task 7: Home "Continue Listening" Section

**Objective:** Show recently played albums with resume capability on the Home page.

**Files:**
- Modify: `apps/frontend/src/app/(dashboard)/jellyfin/music/page.tsx`

**Step 1: Add Continue Listening section**

Uses `useRecentlyPlayed(serverId, 12)` (already available). Add as first section below Quick Access:
```tsx
<MusicSection title="Weiter hören" showAllHref="/jellyfin/music/tracks">
  <MusicScrollRow>
    {recentlyPlayed.map(item => (
      <MusicCard key={item.Id} title={item.Name} subtitle={item.AlbumArtist} coverUrl={...} onClick={...} onPlay={...} />
    ))}
  </MusicScrollRow>
</MusicSection>
```

**Step 2: Verify + Commit**

---

## Execution Plan

| Wave | Tasks | Dependencies |
|------|-------|-------------|
| 1 | Task 1 (Create Playlist) + Task 5 (Skeletons) + Task 6 (Color) + Task 7 (Continue Listening) | None — parallel |
| 2 | Task 2 (Playlist CRUD) | Depends on Task 1 |
| 3 | Task 3 (Lyrics) + Task 4 (Gapless) | None — parallel |

Each task is delegated to a fresh subagent with full context. After each wave:
1. Typecheck verification
2. Fix any errors
3. Commit
4. Update review documentation

---

## Verification (after all tasks)

```bash
# Frontend typecheck
npx tsc --noEmit --project apps/frontend/tsconfig.json

# Backend typecheck
npx tsc -p domains/jellyfin/tsconfig.json --noEmit

# Build (optional, may fail on Windows due to EPERM symlinks)
pnpm --filter @lifehub/frontend build
```
