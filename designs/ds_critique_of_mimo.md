# Kritik: jellyfin_mimo_v1.md

Datum: 2026-06-18
Autor: Design-Scan
Status: Analyse

---

## Stärken

1. **Klare Komponenten-Hierarchie** — Server → Library → Items ist logisch strikt getrennt. Jede Komponente hat genau eine Verantwortung. Der Breadcrumb-Pfad `Jellyfin > [Server] > [Bibliothek]` bildet die UX-Navigation exakt auf die Datenstruktur ab.

2. **Implementierbarer Detailgrad** — Jede Komponente hat vollständigen TSX-Code mit Tailwind-Klassen, nicht nur Pseudocode. Keine Interpretationsspielräume. Ein Entwickler kann direkt loslegen.

3. **Durchdachte Zustandsabdeckung** — Empty-States (kein Server, keine Bibliotheken), Loading-Skeleton (12 Platzhalter im Grid), Sync-Status-Badge. Die drei häufigsten Nicht-Normalzustände sind explizit designed.

4. **Query-Key-Invalidierungsmatrix** (§5.2) — Präzise tabellarische Definition, welche Aktion welche Query invalidiert. Das verhindert Stale-Data-Bugs und ist direkt als Test-Spec verwendbar.

5. **Phaseneinteilung mit Aufwandsschätzung** (§11) — 5 Phasen mit Stunden-Angaben. Erzwingt Priorisierung. P1 (Core) ist in ~4h lieferbar — das erlaubt einen schnellen ersten Merge.

---

## Schwächen & Verbesserungspotential

### S1 — Keine Fehlerzustände

Die komplette Fehlerbehandlung fehlt. API-Fehler (503, 401, Timeout), Sync-Failures, kaputte Poster-URLs werden nicht berücksichtigt.

**Fix:** Jeder Query-Hook braucht ein `error`-Prop → `ErrorCard`-Komponente (Retry-Button + Fehlermeldung). Der Image-Proxy muss einen Fallback (404 → Icon) haben, damit eine kaputte Poster-URL nicht das gesamte Grid zerreißt.

### S2 — Keine Paginierung / Virtualisierung bei großen Bibliotheken

Das ItemGrid rendert *alle* Items einer Bibliothek in einem DOM-Baum. Bei 500+ Filmen wird das langsam. Bei 5000+ legt es den Browser lahm.

**Fix:** `useInfiniteQuery` für Items, `@tanstack/react-virtual` für das Grid-Fenster (oder schrittweises Laden mit "Load More"-Button). Oder falls Jellyfin Server-seitig paginiert: die Backend-API muss `offset`/`limit` unterstützen.

### S3 — Access-Token in der URL (§4.5 Poster-URL)

```ts
const posterUrl = `http://${apiHost}:3007/api/v1/jellyfin/items/${item.id}/image?token=${accessToken}`
```

Das legt das JWT in Logs, Browser-History, Referrer-Header und gecachte Seitentitel. Ein klares Security-Problem.

**Fix:** `Authorization: Bearer <token>` im Request-Header (via `fetch` oder `api.get`). Der Image-Endpoint muss das aus dem Header lesen, nicht aus dem Query-String. Oder: signierte temporäre URLs mit Ablaufzeit (z.B. 5 Min). Kein rohes JWT in der URL.

### S4 — Barrierefreiheit nicht adressiert

- `ItemCard` nutzt `<div onClick>` statt `<button>` — keine Tastatur-Bedienung (Enter/Space), kein `role`, kein `tabindex`.
- Kein `aria-label` für Icons/Buttons.
- `prefers-reduced-motion` wird genannt (§7), aber nicht implementiert gezeigt.

**Fix:** `<button>` für klickbare Cards (oder `<div role="button" tabindex="0" onKeyDown={...}>`). Alle Icon-Buttons mit `aria-label`. Das Skeleton-Loading braucht `aria-busy="true"`.

### S5 — Player-Verbesserungen nur angedeutet (§4.8)

Der MediaPlayer ist „bleibt erhalten, leicht improved" — aber kein Code für Video/Audio/Photo, keine Fullscreen-API, kein Picture-in-Picture, keine Wiedergabeliste, kein Fortschrittsbalken.

**Fix:** Entweder P5 streichen und als Issue verschieben, oder konkretisieren: was genau wird verbessert? Aktuell ist P5 zu vage für ~1h Aufwand.

---

## Was sollte in den Final-Plan übernommen werden?

| Idee | Übernehmen? | Begründung |
|------|-------------|------------|
| Komponenten-Aufteilung (8 Komponenten + 3 Hooks) | **Ja** | Aktuelle 667-Zeilen-Datei ist unwartbar |
| LibraryCard mit Typ-Gradienten & Icons | **Ja** | Differenziert Bibliotheken visuell, geringer Aufwand |
| ItemCard mit Poster/Hover/Play-Overlay | **Ja** | Kernstück des Redesigns, Netflix-Paradigma |
| Empty-States + Skeleton-Loading | **Ja** | Solide UX-Grundlage |
| Query-Key-Struktur & Invalidierung | **Ja** | Präzise, testbar, verhindert Stale-Data |
| Responsive Breakpoints | **Ja** | Exakte Werte, kein Rätselraten |
| Image-Proxy (Option A) | **Ja** | Einziger Weg zu echten Postern |
| Phaseneinteilung P1–P5 | **Modifiziert** | Grundidee gut, aber P5 (Player) konkretisieren |
| Token im Query-String | **Nein** | Security-Risiko → Authorization-Header |

## Was sollte NICHT übernommen werden?

1. **Token in der URL** (§4.5) — ersetzt durch `Authorization: Bearer`-Header oder signierte temporäre URLs.
2. **Fehlende Paginierung** — vor ItemGrid-Implementierung muss entschieden werden: Infinite-Query (TanStack) oder Virtualisierung (react-virtual). Der Entwurf ignoriert das Problem.
3. **P5 (Player-Improvements)** in dieser Form — entweder konkretisieren (Welche Shortcuts? Welche UI-Änderungen?) oder aus dem Scope streichen. „Leicht improved" ist kein Plan.

---

## Fazit

Der Entwurf liefert ein hervorragendes **visuelles und architektonisches Grundgerüst** — die Komponenten-Struktur, die Query-Logik und die UX-Zustände sind durchdacht und direkt umsetzbar.

Die drei kritischen Lücken sind: **Fehlerbehandlung** (fehlt komplett), **Paginierung** (ignoriert), **Auth-Security** (Token in URL). Diese müssen vor dem Merge in den Final-Plan geschlossen werden, sonst entstehen Produktions-Bugs.

Aufwandskorrektur: ~10h + ~2h für Paginierung + ~1h für Fehlerzustände = **~13h** für ein produktionsreifes Redesign.
