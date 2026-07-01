# Design-Kritik: dashboard_grid_mimo_v1.md

**Kritiker:** DeepSeek (DS)  
**Bewertetes Dokument:** `dashboard_grid_mimo_v1.md` (1364 Zeilen, Mimo v2.5-free)  
**Vergleichsdesign:** `dashboard_grid_ds_v1.md` (1314 Zeilen)  
**Datum:** 2026-06-19  
**Kontext:** LifeHub, Next.js 14, Tailwind CSS 3, TypeScript strict, keine neuen npm-Pakete

---

## 1. Stärken des Mimo-Designs

### S1 — NormalizeLayout als robuste Kollisionsauflösung (§3.6)

```typescript
function normalizeLayout(widgets: Widget[], columns: number): Widget[] {
  // Sortiert nach y, dann x. Scannt von oben-links, schiebt Widgets nach oben.
  // Schließt Lücken systematisch, statt nur Kollidierte zu verschieben.
```

Mimo implementiert eine vollständige Layout-Normalisierung, die Lücken im Grid schließt und Widgets konsequent nach oben rückt. DS hat `findFreePosition()` für neue Widgets, aber keine vergleichbare Neuordnung bei Drag/Resize. Mimo's `normalizeLayout` ist algebraisch vollständig — es garantiert ein dichtes Layout ohne Überlappungen, unabhängig von der Drag-Historie. **DS übernimmt diese Idee.**

### S2 — DragAction als discriminated union (§3.2)

```typescript
type DragAction =
  | { type: 'START'; payload: DragState }
  | { type: 'MOVE'; payload: { currentX: number; currentY: number } }
  | { type: 'END' };
```

Mimo modelliert Drag-State-Übergänge als getypte Discriminated Union. Das ermöglicht exhaustive TypeScript-Checks in Reducer-Funktionen. DS verwendet flache Interface-Typen. **DS übernimmt dieses Pattern.**

### S3 — WidgetConfig-Typen mit Domain-Modellen (§6.1)

```typescript
export interface CalendarConfig { weekStart: 'monday' | 'sunday'; showWeekNumbers: boolean; }
export interface WeatherConfig { locations: WeatherLocation[]; activeLocationIndex: number; }
export interface MediaConfig { albumIds: string[]; slideshowInterval: number; }
```

Mimo definiert typsichere Konfigurations-Interfaces für jeden Widget-Typ. DS hat nur `config?: Record<string, unknown>`. Mimo's Ansatz verhindert Runtime-Fehler durch falsch typisierte Configs und ist direkt als API-Contract verwendbar. **DS übernimmt diese Typen.**

### S4 — Implementierungs-Reihenfolge mit Abhängigkeitsgraph (Appendix C)

```
1. lib/grid-utils.ts       ← Pure Functions, keine React-Abhängigkeit
2. hooks/use-grid-layout.ts ← Responsive Hook
3. components/ResizeHandle.tsx ← Kleinste UI-Komponente
...
12. app/(dashboard)/dashboard/page.tsx ← Refactor
```

Mimo definiert eine explizite Build-Reihenfolge, die Bottom-up von Pure Functions über Hooks zu UI-Komponenten läuft. Jeder Schritt baut auf vorherigen auf. DS hat keine vergleichbare Ablaufsteuerung. **DS übernimmt diese Reihenfolge.**

### S5 — Appendix A & B: Visuelle Referenzmatrizen

Das Breakpoint-Verhaltensdiagramm (§Appendix A) und die Widget-Größen-Matrix (§Appendix B) sind visuelle Repräsentationen, die komplexes Grid-Verhalten auf einen Blick verständlich machen. DS hat nur Tabellenbeschreibungen.

---

## 2. Schwächen & Verbesserungspotential

### W1 — Zustand für DnD/Resize: `useState` statt Zustand-Store (§8)

**Problem:** Mimo lagert **allen** transienten DnD-State in React `useState` der DashboardGrid:

```
Drag-State (laufender Drag)     → React useState (DashboardGrid)
Resize-State (laufendes Resize) → React useState (DashboardGrid)
Drop-Target (visuell)           → React useState (DashboardGrid)
```

Bei jeder Mausbewegung (60fps) ändert sich `currentX`/`currentY` im DragState. React useState löst bei jedem Setter einen Re-Render der gesamten DashboardGrid aus → Re-Render aller GridWidgets. Bei 20+ Widgets spürbare Frame-Drops.

**DS-Lösung:** Zustand-Store (`grid-store.ts`) mit selektivem Subscribe. Nur die Widgets, deren `isDragging`-Status sich ändert, rerendern. Der Position-Update (60fps) wird im Store gehalten und nur vom Drag-Ghost gelesen.

**Fix:** Mimo muss transienten State aus `useState` in Zustand auslagern. Die State-Tabelle (§8.1) ist korrekt, aber die Implementierung (§8.2) nutzt useState nicht useGridStore. Widerspruch zwischen Design und Code.

### W2 — Duplizierter `queryKey` (Zeile 960-961)

```typescript
const { data: layout, isLoading, isError } = useQuery({
  queryKey: ['dashboard-layout'],
  queryKey: ['dashboard-layout'],   // ← DUPLIKAT! TypeScript-Fehler
  queryFn: () => api.get<DashboardLayout>('/dashboard/layout'),
```

**Problem:** `queryKey` ist doppelt im selben Objektliteral. In TypeScript strict/ESLint führt das zu einem Kompilierfehler (Duplicate property). Das Dokument ist so nicht implementierbar.

**Fix:** Zweite Zeile entfernen.

### W3 — `ALLOWED_WIDGET_SIZES` nicht durchgesetzt (§4.2 vs §6.1)

**Problem:** Mimo definiert 13 erlaubte Widget-Größen in §6.1 als `ALLOWED_WIDGET_SIZES`, aber die Resize-Logik in §4.2 verwendet nur `Math.round()` ohne Check gegen diese Liste:

```typescript
const newW = Math.max(1, Math.min(columns, resizeState.startW + deltaCols));
const newH = Math.max(1, Math.min(8, resizeState.startH + deltaRows));
// Use Math.round → snappedW, snappedH
// KEINE Prüfung gegen ALLOWED_WIDGET_SIZES!
```

Ein Widget mit `w=2, h=2` könnte auf `w=2, h=1` resized werden — was nicht in der Allowlist ist. Die Konstante ist totes Gewicht.

**DS-Lösung:** `snapToAllowedSize()` mit Manhattan-Distanz zur nächsten erlaubten Kombination:

```typescript
function snapToAllowedSize(w: number, h: number): SnappedSize {
  let best: SnappedSize = { w: 1, h: 1 };
  let bestDist = Infinity;
  for (const [aw, ah] of ALLOWED_SIZES) {
    const dist = Math.abs(aw - w) + Math.abs(ah - h);
    if (dist < bestDist) { bestDist = dist; best = { w: aw, h: ah }; }
  }
  return best;
}
```

**Fix:** `snapToAllowedSize` in den Resize-Flow integrieren.

### W4 — Dead Code: `canResizeTo()` definiert, nie aufgerufen (§4.4)

```typescript
function canResizeTo(widget: Widget, targetW: number, targetH: number, columns: number): boolean {
  if (widget.x + targetW > columns) return false;
  return true;
}
```

**Problem:** Diese Funktion wird in §4.2 definiert, aber nirgends im Resize-Flow referenziert. Der Resize-Handler prüft Kollisionen direkt, ohne `canResizeTo` zu nutzen. Die rechte-Grenzen-Prüfung (`widget.x + targetW > columns`) fehlt tatsächlich im Resize-Code → Widgets können über die rechte Grid-Grenze resized werden.

**Fix:** `canResizeTo` entweder in den Resize-Flow einbauen oder entfernen.

### W5 — Touch-DnD entkoppelt und re-render-intensiv (§3.8)

**Problem 1:** `useTouchDrag` ist ein separater Hook, der parallel zum HTML5-DnD-Hook läuft. Die `touchState`-Updates laufen nicht über den Haupt-DnD-Flow → zwei parallele State-Management-Pfade.

**Problem 2:** `handleTouchMove` nutzt `setTouchState(prev => ...)` — bei jedem `touchmove` (60fps) ein React-Re-Render auf der DashboardGrid. Selbes Problem wie W1.

```typescript
const handleTouchMove = (e: TouchEvent) => {
  if (!touchState) return;
  e.preventDefault();
  setTouchState(prev => prev ? { ...prev, currentX: touch.clientX, currentY: touch.clientY } : null);
};
```

**DS-Lösung:** Touch-Integration im gleichen Hook wie Maus-DnD. Der Hook publiziert eine einheitliche `handleDragStart(dragEvent | touchEvent)`-API.

---

## 3. Übernahme-Entscheidungen

### ✅ Übernehmen (in DS-Design integrieren)

| Idee | Aus Mimo (§) | Begründung |
|------|-------------|------------|
| **normalizeLayout()** | §3.6 | Vollständige Lücken-Schließung, DS hat nur `findFreePosition` |
| **DragAction discriminated union** | §3.2 | Typsichere State-Übergänge, exakte Pattern-Matching-Möglichkeit |
| **WidgetConfig-Typen** | §6.1 | Statt `Record<string, unknown>` — typsichere Config pro Widget-Typ |
| **Implementierungs-Reihenfolge** | Appendix C | Bottom-up von pure functions → Planungssicherheit |
| **Breakpoint-/Size-Matrizen** | Appendix A+B | Visuelle Referenz, erleichtert Code-Review |
| **`WIDGET_DEFAULT_SIZES` pro Typ** | §6.1 | DS hat dasselbe — bestätigt korrekten Ansatz |
| **Browser-Kompatibilitätstabelle** | §9.5 | Explizite Nennung getesteter Browser |
| **`resolveCollision` mit Shift** | §3.5 | Basis für Drag-Reordering, DS muss ergänzen |

### ❌ Nicht übernehmen

| Idee | Grund |
|------|-------|
| **`useState` für Drag/Resize-State** | Führt zu Re-Render-Storm bei 60fps-Updates. DS nutzt Zustand-Store. |
| **Separater Touch-DnD-Hook** | Erzeugt parallele State-Pfade. DS integriert Touch in den Maus-DnD-Hook. |
| **`canResizeTo()` als dead code** | Ungenutzt, wird nie im Resize-Flow referenziert. |
| **Fehlendes snapToAllowedSize** | `ALLOWED_WIDGET_SIZES` wird definiert aber nicht durchgesetzt. DS hat `snapToAllowedSize`. |
| **grid-utils.ts im `lib/`-Ordner** | DS hält Grid-Utils im dashboard-eigenen `types.ts`. Kein Cross-Domain-Export nötig. |
| **`useTouchDrag` als eigener Hook** | Zersplittert die DnD-Logik. DS hat einen Hook für Maus + Touch. |

---

## 4. Vergleich: DS vs. Mimo

### Wo ist DS besser?

| Aspekt | DS | Mimo |
|--------|-----|------|
| **DnD-State-Management** | Zustand-Store mit selektivem Subscribe → kein Re-Render-Storm | React `useState` → Re-Render bei jedem Pixel |
| **Resize-Snapping** | `snapToAllowedSize()` mit Manhattan-Distanz → garantiert erlaubte Größen | `Math.round()` → kann invalide Größen erzeugen |
| **CSS-Responsiveness** | `@container`-Queries + CSS-only für Grid-Spalten | JS `ResizeObserver` + Inline-Styles → JS-Abhängigkeit |
| **API-Rollback** | `onMutate`/`onError` mit previousLayout.ref | Nur `onError` im saveMutation |
| **Debounce-Quelle** | Prüft `throttle-debounce` aus TanStack-Dep-Tree + Fallback | `@/lib/debounce` — Existenz nicht geprüft |
| **Touch-Integration** | Ein Hook für Maus + Touch | Zwei parallele Hooks (`useDragAndDrop` + `useTouchDrag`) |
| **Dead Code** | Keine ungenutzten Funktionen | `canResizeTo()` ungenutzt, `ALLOWED_WIDGET_SIZES` ungeprüft |
| **TypeScript-Strictness** | Keine Duplikate | `queryKey` doppelt (build-breaking) |

### Wo ist Mimo besser?

| Aspekt | Mimo | DS |
|--------|------|-----|
| **Layout-Normalisierung** | `normalizeLayout()` — schließt Lücken, schiebt nach oben | Nur `findFreePosition()` für neue Widgets |
| **TypeScript-Discriminated-Unions** | `DragAction` mit `START`/`MOVE`/`END` | Flache Interfaces ohne Union |
| **WidgetConfig-Typen** | `CalendarConfig`, `WeatherConfig`, `MediaConfig` | `Record<string, unknown>` (unsicher) |
| **Implementierungs-Reihenfolge** | Expliziter Build-Plan (12 Schritte) | Keine vergleichbare Auflistung |
| **Edge-Case-Tiefe** | 8 Edge Cases mit Code, Browser-Tabelle, Touch-Strategie | 11 Edge Cases, aber weniger detailliert |
| **Visuelle Referenzen** | Breakpoint-Diagramm + Size-Matrix | Nur Tabellen |
| **Dokumentationsumfang** | 1364 Zeilen, 10 Haupt- + 3 Appendix-Sektionen | 1314 Zeilen, 13 Sektionen |
| **Kollisions-Shift** | `resolveCollision` schiebt Kollidierte nach unten | Nur `findFreePosition` |
| **Widget-Config-Abstraktion** | `config?: WidgetConfig` als Union | `config?: Record<string, unknown>` |

### Kritische Bewertung

DS' **Hauptvorteil** ist das State-Management: Zustand statt useState für transienten DnD-State. Das ist kein Stil-Urteil, sondern eine Performance-Notwendigkeit — 60fps-Maus-Updates dürfen nicht durch React Reconciliation laufen.

Mimos **Hauptvorteil** ist die Robustheit der Layout-Algorithmen: `normalizeLayout()` ist algebraisch vollständig, während DS' `findFreePosition()` nur eine Platzierungssuche ist. Mimo hat die Domain-Logik besser durchdacht.

**Die optimale Lösung:** Mimos Algorithmen (`normalizeLayout`, `DragAction`, WidgetConfig-Typen) + DS' State-Management (Zustand-Store, `snapToAllowedSize`, `@container`-CSS).

---

## 5. Änderungsvorschläge für Mimo-Design (vor Implementierung)

1. **Zustand-Store einführen** — DragState + ResizeState + DropTarget aus `useState` in Zustand migrieren. GridWidgets subscriben nur auf `isDragging`/`isResizing` für ihr eigenes Widget.
2. **`snapToAllowedSize` integrieren** — `newW`/`newH` aus Resize durch `snapToAllowedSize` jagen.
3. **`canResizeTo` entfernen oder verwenden** — entweder in Resize-Flow einbauen oder löschen.
4. **`queryKey`-Duplikat entfernen** — Zeile 960-961 korrigieren.
5. **Touch-DnD in Haupt-Hook integrieren** — `useTouchDrag`-Logik in `useDragAndDrop` mergen.
6. **`.grid-cols-{n}`-Klassen gegen `@container` tauschen** — CSS Container Queries sind performanter als JS ResizeObserver + Inline-Style.
7. **`ALLOWED_WIDGET_SIZES` in resize und add durchsetzen** — `snapToAllowedSize` bei addWidget und resize aufrufen.
8. **Debounce-Fallback definieren** — `@/lib/debounce` existiert nicht → eigene `debounce()`-Utility.

---

## 6. Fazit

Mimo liefert mit 1364 Zeilen das **detailliertere und algorithmisch durchdachtere Dokument**. Die Layout-Normalisierung, die Discriminated Unions und die WidgetConfig-Typen sind qualitativ hochwertiger als DS' Äquivalente.

Die zwei **kritischen Schwächen** sind:
1. **State-Management mit useState statt Zustand** — führt bei 60fps-DnD zu Re-Render-Storms
2. **`ALLOWED_WIDGET_SIZES` nicht durchgesetzt + `canResizeTo()` dead code** — inkonsistente Implementierung

**Takeaway:** Mimo hat die bessere Domain-Logik. DS hat das bessere State-Management. Die optimale Implementierung kombiniert Mimos Algorithmen mit DS' Zustand-Store.

*Kombinierte Umsetzungszeit (geschätzt): ~8h (3h Mimo-Basis + 3h DS-State-Management + 2h Tests)*
