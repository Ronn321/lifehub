# Kritik: Deepseek Dashboard Grid Design v1

**Autor:** mimo-v2.5-free  
**Datum:** 2026-06-19  
**Basiert auf:** `dashboard_grid_ds_v1.md` (Deepseek-Design)  
**Vergleichsdesign:** `dashboard_grid_mimo_v1.md`

---

## 1. Stärken des Deepseek-Designs

### 1.1 Container Queries statt Media Queries

Deepseek nutzt `container-type: inline-size` + `@container`-Queries (Zeile 210-226), die auf die tatsächliche Breite des Dashboard-Bereichs reagieren — nicht auf den Viewport. Das ist korrekt und besser als Media Queries, weil die Sidebar (collapsed/expanded) die verfügbare Breite ändert. Mein Design nutzt `ResizeObserver` + `useState`, was funktioniert, aber mehr JS-Bridge-Code erfordert. **Deepseek gewinnt hier klar.**

### 1.2 Vollständige Zustandstabelle (§9.1)

Die State-Ownership-Tabelle (Zeile 1027-1034) ist eine der besten Stellen im ganzen Dokument. Jeder Concern ist einer Speicherort zugewiesen mit Begründung — `TanStack Query Cache` für Server-State, `Zustand` für transient DnD/Resize, `useState` für lokale UI-Zustände. Das ist präzise und direkt umsetzbar. Mein Design hat das implizit, aber nicht so sauber dokumentiert.

### 1.3 Optimistic Update mit Rollback (§8.2)

Der `onMutate`/`onError`/`onSettled`-Pattern (Zeile 975-993) ist ein exakter TanStack Query Standard-Pattern mit korrektem Rollback. Kein Overhead, keine Erklärung nötig — das ist produktionsreifer Code. Mein `useDashboardMutation` hat dasselbe Muster, aber Deepseek liefert den `previousLayout`-Ref sauberer gelöst.

### 1.4 Phase-2-Ausschlussliste (§12)

13 explizit ausgeschlossene Features mit Begründung und Phase (Zeile 1188-1208). Das ist Disziplin. Mein Design hat eine ähnliche Liste, aber Deepseeks ist spezifischer — z.B. "Drag overlay animation (Framer Motion) — No new deps — CSS transitions only" ist eine klare Architektur-Entscheidung, nicht nur eine Feature-Ausgrenzung.

### 1.5 Edge-Case-Abdeckung (§11)

11 dokumentierte Edge Cases (Zeile 1116-1184) — von "leeres Layout" über "Widget außerhalb Grid ablegen" bis "Widget-ID-Kollision". Besonders gut: §11.5 (Mobile/Touch) und §11.10 (Schnelle aufeinanderfolgende Drags). Mein Design hat 8 Edge Cases, aber Deepseek ist hier vollständiger.

---

## 2. Schwächen / Verbesserungspotential

### 2.1 File Layout inkonsistent mit Manifest

Die Dateistruktur (§1.2, Zeile 47-65) zeigt 7 neue Dateien + 1 Zustand-Store. Aber das File Manifest (§13, Zeile 1211-1243) lists andere Dateien auf. `widget-settings-router.tsx` wird in §1.2 gelistet, aber in §13 als "stays in page.tsx" markiert. `use-drag-to-reorder.ts` wird in §1.2 gelistet, aber in §13 als "inlined into dashboard-grid.tsx" gestrichen. Das ist verwirrend und wird zu Inkonsistenzen bei der Implementierung führen.

### 2.2 Resize-Logik hat einen Bug in den Event-Listenern

In §5.2 (Zeile 548) wird `touchmove` fälschlicherweise an `handleEnd` gebunden statt an `handleMove`:

```typescript
window.addEventListener('touchmove', handleEnd); // BUG: sollte handleMove sein
```

Das bedeutet: Jedes `touchmove`-Event würde den Resize sofort beenden. Touch-Resize funktioniert nicht.

### 2.3 Zu wenig strukturierte Pure Functions

Mein Design extrahiert Kollisionserkennung, Platzfindung und Snapping in `grid-utils.ts` — reine Funktionen ohne React-Abhängigkeit, sofort testbar. Deepseek hat die Algorithmen in den jeweiligen Hooks verstreut (`findDropTarget` in §4.2, `findFreePosition` in §4.3, `snapToGrid` in §5.3, `rectsOverlap` in §4.3). Das macht Unit-Tests schwieriger und führt zu Duplikaten.

### 2.4 `throttle-debounce` als versteckte Abhängigkeit

In §8.3 (Zeile 1000) wird `throttle-debounce` als Abhängigkeit von TanStack Query's DevTools behauptet. Das ist fragwürdig — DevTools-Dependencies sollte man nicht für Produktionscode nutzen. Mein Design implementiert eine eigene 3-Zeiler-Debounce-Funktion, was die "zero new npm packages"-Regel sicher einhält.

### 2.5 Resize-Snapping nutzt Manhattan-Distanz ohne Gewichtung

In `snapToAllowedSize` (Zeile 585-599) wird `|aw - w| + |ah - h|` berechnet. Das treatet Breite und Höhe gleich, aber visuell ist eine Breitenänderung spürbar anders als eine Höhenänderung. Ein 3x2→4x2 Wechsel sollte "näher" sein als ein 3x2→3x3, weil horizontales Ziehen dominierend ist. Das fehlt.

---

## 3. Welche Ideen übernehme ich? Welche nicht?

### Übernehme ich (mit Begründung)

| Idee | Grund |
|------|-------|
| `@container`-Queries (§3.1) | Besser als mein ResizeObserver-Ansatz. Sidebar-unabhängig, nativ CSS, kein JS-Overhead. |
| Zustandstabelle §9.1 | Klarere Dokumentation der State-Verteilung. Übernehme als Referenz in mein Design. |
| `widget-enter` Keyframe-Animation (§7) | Nettes Polishing beim Hinzufügen. CSS-only, kein Overhead. |
| `ALLOWED_SIZES` als explizites Tupel-Array | Meine `ALLOWED_WIDGET_SIZES` als Objekte ist schwerer zu erweitern. Tupel `[w, h]` ist kompakter. |
| Debounced Save für Resize (§8.3) | Mein Design fehlt das — bei Resize wird jeder `mousemove` persistiert. Das ist zu aggressiv. |

### Übernehme ich NICHT (mit Begründung)

| Idee | Grund |
|------|-------|
| `throttle-debounce` aus DevTools-Tree | Unsichere Abhängigkeit. Eigene Implementierung ist 3 Zeilen. |
| `!important` in Container-Query-Regeln (§7, Zeile 893-909) | `!important` ist ein Code-Smell. Besser: spezifischerer Selektor oder Inline-Style als Fallback. |
| `touchmove` → `handleEnd` Bug (§5.2) | Offensichtlicher Fehler, nicht übernehmbar. |
| Verworfene Hooks (§13: `use-drag-to-reorder.ts`, `use-resize-observer.ts`) | Deepseek wirft eigene Hooks weg, die es in §1.2 noch gelistet hat. Inkonsistenz. Ich halte an meinen dedizierten Hooks fest. |
| `ASPECT_RATIO = 1` (§2, Zeile 140) | Quasi hardcoded. Mein dynamischer `getCellHeight()`-Ansatz ist flexibler. |

---

## 4. Vergleich: Wo ist mimo besser? Wo ist Deepseek besser?

### mimo ist besser bei:

1. **Pure Functions in `grid-utils.ts`** — Kollision, Platzfindung, Snapping, Normalize sind sauber getrennt von React. Testbar, wiederverwendbar. Deepseek hat das verstreut in Hooks.

2. **`normalizeLayout()`-Funktion** (mein §3.6) — Schließt Lücken nach DnD-Operationen automatisch. Deepseek hat das nicht. Ohne Normalize entstehen nach wiederholtem Drag & Drop Lücken im Grid, die nie geschlossen werden.

3. **Touch-DnD über `data-drag-handle`-Attribut** (mein §3.8, Zeile 415) — Nur Drag-Handle startet Touch-Drag, nicht das ganze Widget. Deepseeks Touch-Polyfill (§4.5) klonst das gesamte Widget als Ghost — das blockiert versehentliche Scrolls.

4. **WidgetContextMenu** — Mein Design hat ein dediziertes Kontextmenü. Deepseek hat nur Settings + Delete im Header — weniger erweiterbar.

5. **Typisierte Widget-Konfigurationen** — Mein `WidgetConfig` (Zeile 833-858) hat explizite Interfaces für Calendar, Weather, Media. Deepseek nutzt `Record<string, unknown>` — type-unsafe.

### Deepseek ist besser bei:

1. **Container Queries** — Mein ResizeObserver-Ansatz funktioniert, aber Deepseeks CSS-only Lösung ist eleganter und hat weniger JS-Overhead.

2. **Edge-Case-Dokumentation** — 11 vs. 8 Cases. Besonders §11.5 (Mobile/Touch-Verhalten) und §11.10 (Schnelle Drags) sind bei Deepseek vollständiger.

3. **Phase-2-Disziplin** — 13 explizit ausgeschlossene Features mit Phase-Zuordnung. Mein Design hat eine kürzere Liste ohne klare Phasen-Zuordnung.

4. **State-Ownership-Tabelle** — Kompaktere, klarere Dokumentation als mein implizites Verteilungsmuster.

5. **Drag-Visual-Feedback** — Deepseeks `rotate(1deg) scale(1.02)` (Zeile 411) für den "lifted"-Effekt ist ein schönes UX-Detail, das mein Design nicht hat.

---

## 5. Zusammenfassung & Empfehlung

Deepseeks Design ist ein solides Arbeitsdokument mit guter Edge-Case-Abdeckung und sauberer State-Dokumentation. Die Container-Query-Lösung ist vorbildlich. Aber es hat inkonsistente File-Layouts, einen kritischen Touch-Resize-Bug, und die Algorithmen sind nicht ausreichend getrennt von der React-Logik.

**Mein Design ist implementierungsfertiger** wegen:
- Sauberer `grid-utils.ts`-Extraktion (testbar)
- `normalizeLayout()` (keine Lücken)
- Typisierte Widget-Configs
- Konsistente Hook-Struktur

**Übernehme aus Deepseek:**
1. `@container`-Queries (ersetze meinen ResizeObserver)
2. Debounced Save für Resize
3. Zustandstabelle als Dokumentationsformat
4. `widget-enter` Keyframe-Animation
5. `ALLOWED_SIZES` als Tupel-Array

**Nicht übernehmen:**
1. `throttle-debounce` als Abhängigkeit
2. `!important` in CSS
3. Touch-Bug
4. Fehlende `normalizeLayout()`
5. `Record<string, unknown>` für Configs

---

*Ende der Kritik*
