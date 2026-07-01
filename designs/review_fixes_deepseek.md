# Review: Jellyfin-Frontend-Seite (page.tsx)

Gelesen: `apps/frontend/src/app/(dashboard)/jellyfin/page.tsx` (899 Zeilen)
Verglichen mit: `media/page.tsx`, `calendar/page.tsx`, `lib/api.ts`

---

## 1. State-Flow: Servers → Libraries → Items → Player

**Korrekt.** Der State-Flow ist linear und sauber:

| State | Bedingung | Gerendert |
|-------|----------|-----------|
| `selectedServer = null` | Kein Server gewählt | `ServerSection` allein |
| `selectedServer != null` | Server gewählt | `ServerSection` + `LibrariesTab` |
| `selectedLibrary != null` | Bibliothek gewählt | `ServerSection` + `ItemsTab` |
| `playingItem != null` | Player geöffnet | `MediaPlayer`-Overlay |

**Bemerkung:** `ServerSection` wird immer gerendert, auch wenn ein Server/Library ausgewählt ist. Das ist i.O. – der User kann jederzeit den Server wechseln.

---

## 2. Tailwind-Klassen

**Alle Klassen korrekt.** Keine Tippfehler, keine LifeHub-unbekannten Utility-Klassen.

Konsistent mit `media/page.tsx`:
- `bg-bg`, `bg-bg-surface`, `bg-bg-raised`, `text-fg`, `text-fg-muted`
- `brand-500` als Akzentfarbe
- `danger` für Fehler
- `border-border`, `border-border-strong`
- `cn()` für bedingte Klassen

---

## 3. Runtime-Fehler (undefined / null checks)

**Gut abgesichert.** Alle gefundenen Problemstellen:

### 3.1 BUG: `toggleMut.isPending` deaktiviert ALLE ItemCards

`apps/frontend/src/app/(dashboard)/jellyfin/page.tsx:614-618`

```tsx
// Aktuell (falsch): single isPending blockiert alle Toggle-Buttons
isToggling={toggleMut.isPending}
```

Wenn ein Item getoggled wird, sind **alle** Toggle-Buttons deaktiviert. Das ist ein UX-Bug.

**Fix:** Per-Item-Tracking mit `togglingId`-State in `ItemsTab`:

```tsx
// ItemsTab
const [togglingId, setTogglingId] = useState<string | null>(null);

const toggleMut = useMutation({
  mutationFn: (itemId: string) => api.post<JellyfinItem>(`/jellyfin/items/${itemId}/toggle-watched`),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['jellyfin-items', libraryId] });
  },
  onSettled: () => setTogglingId(null),
});

// Im render:
onToggleWatched={() => {
  setTogglingId(item.id);
  toggleMut.mutate(item.id);
}}
isToggling={togglingId === item.id}
```

### 3.2 BUG: Stream-URL hardcodiert `http://` (Mixed Content)

`apps/frontend/src/app/(dashboard)/jellyfin/page.tsx:794-795`

```tsx
const streamUrl = `http://${apiHost}:3007/api/v1/jellyfin/items/${item.id}/stream?token=${encodeURIComponent(accessToken)}`;
```

Wenn die Seite über HTTPS ausgeliefert wird (z. B. hinter Traefik/Tailscale), erzeugt `http://` Mixed-Content-Warnungen und der Stream wird vom Browser blockiert.

**Fix:** Protokoll aus `window.location.protocol` ableiten oder den API-Base-URL aus `api.ts` wiederverwenden:

```tsx
const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
const streamUrl = `${protocol}//${apiHost}:3007/api/v1/jellyfin/items/${item.id}/stream?token=${encodeURIComponent(accessToken)}`;
```

### 3.3 BUG: MediaPlayer lädt ohne vorherige Interaktion

`apps/frontend/src/app/(dashboard)/jellyfin/page.tsx:832-837`

```tsx
{!loaded && !error && (
  <div className="flex items-center justify-center py-20 text-white/60">
    <Loader2 className="h-6 w-6 animate-spin mr-2" />
    {isPhoto ? 'Lade Bild…' : 'Medienplayer wird geladen…'}
  </div>
)}
```

Das `loaded`-State-Handling hat eine Subtilität: `handleError` setzt BOTH `error` UND `loaded=true`. Dadurch wird der Loading-Spinner korrekt ausgeblendet. Funktioniert, aber ist nicht intuitiv.

**Kein dringender Fix, aber Dokumentation wert.**

---

## 4. UI-Konsistenz mit LifeHub

### 4.1 Design-System: OK

Verwendet korrektes LifeHub-Design-System (brand-500 Akzent, bg/text/border-Tokens). Konsistent mit `media/page.tsx`.

Die `calendar/page.tsx` verwendet ein älteres/zinc-basiertes System – die Jellyfin-Seite ist **näher am aktuellen Standard**.

### 4.2 Minimale Inkonsistenz: `ItemToolbar` verwendet `bg-bg` statt `bg-bg-surface`

`apps/frontend/src/app/(dashboard)/jellyfin/page.tsx:738`

```tsx
<div className="flex gap-1 rounded-md border border-border bg-bg p-0.5">
```

`media/page.tsx:182` verwendet für denselben Tab-Toggle-Container:

```tsx
<div className="flex gap-1 rounded-md border border-border bg-bg-surface p-1 w-fit">
```

**Optionaler Fix:** Konsistenz halber `bg-bg` → `bg-bg-surface`.

---

## 5. Fehlende States

**Alle wichtigen States sind vorhanden:**

| Komponente | Loading | Empty | Error |
|-----------|---------|-------|-------|
| `ServerSection` | ✓ | ✓ | ✓ |
| `LibrariesTab` | ✓ (SkeletonGrid) | ✓ | ✓ |
| `ItemsTab` | ✓ (SkeletonGrid) | ✓ (4 Varianten) | ✓ |
| `MediaPlayer` | ✓ | n/a | ✓ |
| `ConnectDialog` | ✓ (isPending) | n/a | ✓ |

**Besonders gut:** ItemsTab hat **4 Empty-Varianten** (Suche, alle/gelesen/ungelesen-Filter).

---

## 6. Deutsche UI-Texte

### 6.1 Fehler: "Als gelesen/ungelesen markieren"

`apps/frontend/src/app/(dashboard)/jellyfin/page.tsx:716`

```tsx
title={item.watched ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
```

Für eine Media-Bibliothek unpassend (`gelesen` = read, nicht watched/seen). Muss heißen:

```tsx
title={item.watched ? 'Als ungesehen markieren' : 'Als gesehen markieren'}
```

### 6.2 "Syncen" ist Denglisch

`apps/frontend/src/app/(dashboard)/jellyfin/page.tsx:316`

```tsx
<><RefreshCw className="h-3 w-3" /> Syncen</>
```

Besser:

```tsx
<><RefreshCw className="h-3 w-3" /> Synchronisieren</>
```

### 6.3 Alle anderen Texte: korrekt

- "Authentifizierung läuft …" ✓
- "Verwalte deine Jellyfin-Mediathek – Server, Bibliotheken und Medien." ✓
- "Server verbinden" ✓
- "Verbunden seit" + `de-DE`-Format ✓
- "Server wirklich entfernen?" ✓
- "Noch keine Server verbunden" / "Keine Bibliotheken gefunden" / "Keine Medien ..." ✓
- "URL und API-Key dürfen nicht leer sein." ✓
- "Abbrechen", "Verbinden", "Verbinde…" ✓
- "Zuletzt synchronisiert: vor {formatTimeAgo}" ✓
- "← Zurück" ✓
- "Alle", "Gesehen", "Ungesehen" ✓
- Filter-Empty-Strings ("Keine gesehenen Medien", "Keine ungesehenen Medien") ✓
- "Medien konnte nicht geladen werden. ..." ✓

---

## 7. Zusammenfassung

| # | Severity | File | Line(s) | Beschreibung |
|---|----------|------|---------|-------------|
| 1 | 🔴 BUG | `page.tsx` | 614-618 | `toggleMut.isPending` blockiert alle ItemCards |
| 2 | 🟡 BUG | `page.tsx` | 795 | Hardcodiertes `http://` → Mixed Content bei HTTPS |
| 3 | 🟡 UI | `page.tsx` | 716 | "gelesen/ungelesen" → "gesehen/ungesehen" |
| 4 | 🟢 UX | `page.tsx` | 316 | "Syncen" → "Synchronisieren" |
| 5 | 🟢 UI | `page.tsx` | 738 | Optional: `bg-bg` → `bg-bg-surface` für Konsistenz |

**Gesamteindruck:** Solide Implementation. State-Flow, Error-Handling, Loading-States und deutsche Texte sind bis auf die genannten Punkte korrekt. Das shared-`toggleMut.isPending` (Bug #1) sollte zwingend gefixt werden, da es die UI für den User spürbar verschlechtert.
