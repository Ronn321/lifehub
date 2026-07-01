# Kritik: `media_fixes_ds_v1.md` (DS-Design)

Von: mimo-v2.5-free  
Erstellt: 2026-06-19  
Vergleich: `media_fixes_mimo_v1.md`

---

## 1. Stärken

1. **Detaillierter Backend-Stack mit Code-Beispielen**  
   DS liefert vollständige TypeScript-Signaturen, Zod-Schemas, Drizzle-Queries und Controller-Decorators. Ein Entwickler kann direkt implementieren, ohne zu raten.

2. **Konsistente Query-Key- und Invalidierungs-Tabelle (§8)**  
   MIMO hat nur lose Query-Notizen. DS listet jeden Key, Stale-Time und alle betroffenen Mutationen auf — das verhindert Cache-Bugs.

3. **Explizite "Nicht in Phase 1"-Listen mit Begründungen**  
   DS begründet jede Auslassung (z.B. "Audio-Tag-Parsing → würde neue Library brauchen"). Das schafft Klare Scope-Definition und verhindert Scope Creep.

4. **Player-Store als eigenständiger Zustand mit Typed Interface**  
   DS definiert `PlayerFileInfo` (minimal) statt `TrackEntry` (schwer). Das hält den Store schlank und koppelt ihn nicht an DB-Entitäten.

5. **Datenfluss-Diagramme für alle Szenarien (§8.4–8.5)**  
   Step-by-Step Pfeil-Diagramme für Ordner-Navigation UND Musik-Navigation. MIMO hat nur Text-Blurbs.

---

## 2. Schwächen

1. **Kein `parentPath` im BrowseResult**  
   DS liefert nur `folders` + `files`. Breadcrumbs müssen Client-seitig aus `currentPath` geschnitten werden. MIMO liefert `parentPath` direkt — einfacher für Back-Button-Logik und Deep-Links.

2. **Kein `components/`-Ordner im Frontend-Layout**  
   DS wirft alles in die Media-Root-Dateien (`browse-tab.tsx`, `music-tab.tsx`, `lightbox.tsx`). MIMO strukturiert nach Feature-Ordnern (`components/source-browser/`, `components/lightbox/`, `components/music/`). Für ein 1711-Zeilen-Modul ist das ein Wartungs-Problem.

3. **Kein `currentTime` / `duration` im PlayerState**  
   DS speichert nur `queue`, `currentIndex`, `isPlaying`, `volume`, `isShuffled`, `repeatMode`. Kein `currentTime` für Position-Restore und keinen Fortschrittsbalken. MIMO hat `currentTime: number` — wichtiger für echten Player.

4. **Kein Touch/Pinch-to-Zoom im Lightbox**  
   DS implementiert nur Mausrad-Zoom. MIMO hat `onTouchStart/Move/End` für Pinch-to-Zoom und Swipe-Next/Prev. Für Mobile ein Dealbreaker.

5. **`browseSource()` rekursive Ordner-Zählung ohne Caching**  
   DS zählt für jeden Unterordner rekursiv Mediendateien (Tiefe 2). Bei 50 Ordnern = 50 rekursive `fs.readdir`-Aufrufe pro Page-Load. MIMO setzt auf `fileCount` aus der DB (weniger fs-IO) und erwähnt Paginierung für >1000 Dateien expliziter.

---

## 3. Übernahme-Entscheidungen

| Element | Übernahme? | Grund |
|---------|-----------|-------|
| Zod-Schema für Browse-Request (DS §1.1) | Ja | Typsicher, validiert `path`-Param |
| `parentPath` im Response (MIMO §1.1) | Ja | Bessere Breadcrumb-Logik |
| Feature-Ordner-Struktur (MIMO §2.1) | Ja | Wartbarkeit > Bequemlichkeit |
| PlayerState mit `currentTime` (MIMO §2.3) | Ja | Fortschrittsbalken nötig |
| Pinch-to-Zoom + Swipe (MIMO §4.2) | Ja | Mobile-Experience |
| Query-Key-Tabelle + Invalidierung (DS §8) | Ja | Verhindert Cache-Bugs |
| `MediaFileSummary` als leichtes DTO (MIMO §1.1) | Ja | Kein Full-Entity-Transfer nötig |
| Rekursive fs-Zählung (DS §1.1) | Nein | Zu langsam, DB-Zählung bevorzugen |
| Vidstack `community-skin` CSS-Imports (DS §4.4) | Prüfen | Prüfen ob `@vidstack/react/player/styles/` korrekt ist |
| PlayerContext mit `useReducer` (MIMO §7.4) | Prüfen | Zustand (DS) vs. Context+Reducer (MIMO) — beides gültig |

---

## 4. Gesamtvergleich

| Dimension | DS | MIMO |
|-----------|-----|------|
| Code-Tiefe | **Hoch** (vollständige Implementierung) | Mittel (Interfaces + Logik-Skizzen) |
| Frontend-Architektur | Flach, wenig strukturiert | Feature-Ordner, klarer |
| Mobile/Touch | Nur Keyboard + Maus | Touch-Gesten berücksichtigt |
| Player-Funktionalität | Minimal (Play/Next/Prev) | Mit currentTime, Timeline |
| Edge Cases | Detailliert (9 Fälle) | Komplett (10 Fälle, Tabelle) |
| Scope-Definition | Exzellent (explizit ausgeschlossen) | Gut ( Liste, aber ohne Begründung pro Punkt) |
| Umsetzbarkeit | Direkt kopierbar | Muss ergänzt werden |

**Empfehlung:** MIMO als Architektur-Grundlage nehmen (Feature-Ordner, Touch, currentTime), DS-Code-Snippets für Backend-Implementierung (Query-Keys, Invalidierung, Zod) übernehmen. Hybrid-Ansatz.

---

*Erstellt als Kritik von mimo-v2.5-free zu `designs/media_fixes_ds_v1.md`.*
