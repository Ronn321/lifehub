# Mimo-Kritik: Deepseek Design-Spec v1 (jellyfin_ds_v1.md)

Datum: 2026-06-18
Status: Analyse

---

## 1. Stärken des Entwurfs

### 1.1 Umfassende Komponenten-Hierarchie
Die Aufteilung in 11 spezialisierte Komponenten mit klaren Zuständigkeiten ist exzellent. Die Trennung von `server-section.tsx`, `library-card.tsx`, `item-card.tsx` etc. ermöglicht isolierte Entwicklung und Testing.

### 1.2 Detaillierte Tailwind-Spezifikation
Die Tabellen mit exakten Tailwind-Klassen pro Element sind sehr konkret und direkt umsetzbar. Besonders gut: die Unterscheidung zwischen aktivem/inaktivem Server-Zustand mit `ring-2 ring-brand-500/60` vs. `hover:border-brand-500/40`.

### 1.3 Klare Datenfluss-Dokumentation
Das API-Diagramm in Abschnitt 4.5 mit Query-Keys, Invalidierungslogik und Sequenz ist professionell und verhindert Inkonsistenzen zwischen Frontend und Backend.

### 1.4 Priorisierte Verbesserungsliste
Die Einteilung in P0 (sofort), P1 (mittel), P2 (langfristig) mit Aufwand/Impact-Bewertung ist praktisch für die Planung. Die 20 konkreten Verbesserungen sind realistisch bewertet.

### 1.5 Konkrete Code-Beispiele
Die vollständigen React-Komponenten (LibraryCard, ItemCard, SyncStatusBadge) sind produktionsreif und zeigen klare Intention.

---

## 2. Schwächen & Verbesserungspotenzial

### 2.1 Fehlende Barrierefreiheit (Critical)
Keine ARIA-Labels, keine Keyboard-Navigation für die Poster-Kacheln, keine Fokus-Indikatoren. Für eine familienfreundliche Plattform ein Muss.

**Vorschlag:** `role="button"`, `aria-label`, `tabIndex={0}`, `onKeyDown` für Enter/Space.

### 2.2 Performance bei großen Bibliotheken
Keine Lazy-Loading-Strategie für Posterbilder. Bei 2000+ Fotos in einer Bibliothek wird das initial Laden extrem langsam.

**Vorschlag:** `loading="lazy"` auf `<img>`, Intersection Observer für Virtualisierung (ab 100+ Items).

### 2.3 Fehlende Fehlertoleranz bei Bildern
Kein `onError`-Handler für fehlgeschlagene Poster-Loads. Wenn Jellyfin einen Image-Endpoint nicht erreichbar, bleibt das Poster leer.

**Vorschlag:** `onError` → Fallback-Icon anzeigen + visuelles Feedback.

### 2.4 Inkonsistente Responsive-Breakpoints
Die Item-Grid-Spezifikation nutzt `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`, aber die Library-Grid nur `md:grid-cols-2`. Für konsistente Darstellung auf verschiedenen Geräten sollten die Breakpoints synchronisiert werden.

### 2.5 Keine Integration mit bestehenden LifeHub-Komponenten
Der Entwurf ignoriert die existierenden shadcn/ui-Komponenten (Button, Card, Dialog). Statt eigener Tailwind-Klassen sollten `@/components/ui/button` und `@/components/ui/card` verwendet werden.

---

## 3. Übernahme-Empfehlungen aus Deepseeks Entwurf

### ✅ Übernehmen (Kern-Features)

| Idee | Begründung |
|------|------------|
| **Komponenten-Hierarchie (11 Dateien)** | Exzellente Struktur, direkt übernehmbar |
| **Tailwind-Spezifikationstabellen** | Konkrete Klasse = schnelle Umsetzung |
| **API-Query-Keys + Invalidierung** | Verhindert Cache-Inkonsistenzen |
| **Sync-Status-Badge mit Polling** | Wichtige UX-Verbesserung, geringer Aufwand |
| **Item-Filter-Bar mit Suche + Sortierung** | Erwartete Funktionalität für Mediathek |
| **Skeleton-States** | Professionelles Ladeverhalten |
| **Key-Shortcuts (Esc, Leertaste)** | Erwartetes User-Verhalten |

### ❌ Nicht übernehmen (Überkonstruiert)

| Idee | Begründung |
|------|------------|
| **Komplexe Gradient-Systeme** (typeGradients) | Zu bunt für Dark-Theme, ablenkend. Einfacher: `bg-brand-500/10` reicht. |
| **Masonry-Layout** | Schwer umsetzbar mit CSS Grid, Performance-Probleme. Normales Grid ist ausreichend. |
| **Framer Motion für Grid-Stagger** | Over-Engineering für MVP. Tailwind-Transitions reichen. |
| **Item-Detail-Ansicht mit Metadaten** | Erst relevant nach Phase 2, nicht für MVP. |

---

## 4. Mein Final-Vorschlag (Kombination)

### Phase 1 — Core-Redesign (4h)
- Komponenten-Hierarchie aus Deepseek-Entwurf übernehmen
- Tailwind-Klassen aus Deepseek-Entwurf übernehmen (vereinfacht)
- Item-Filter-Bar + Skeleton-States aus Deepseek-Entwurf
- ARIA-Labels + Keyboard-Navigation ergänzen

### Phase 2 — Poster-Images (2h)
- Image-Proxy-Endpoint (aus Deepseek-Entwurf §4.4)
- `loading="lazy"` + `onError`-Fallback ergänzen

### Phase 3 — Sync-Status (1h)
- Sync-Status-Badge (aus Deepseek-Entwurf §3.5)
- `last_sync_at` Spalte in DB

### Nicht umsetzen (vorläufig)
- Komplexe Gradient-Farben
- Masonry-Layout
- Framer Motion-Animationen
- Item-Detail-Ansicht

---

## 5. Fazit

Deepseek's Entwurf ist technisch solide und pragmatisch. Die Hauptstärke liegt in der Konkretheit der Tailwind-Klassen und der klaren Datenfluss-Dokumentation. Die Schwächen liegen in fehlender Barrierefreiheit und Performance-Optimierung.

**Empfohlene Vorgehensweise:** 
1. Deepseek-Entwurf als Basis nehmen
2. Barrierefreiheit (ARIA, Keyboard) ergänzen
3. Responsive-Breakpoints synchronisieren
4. Mit shadcn/ui-Bausteinen integrieren
5. Komplexe visuelle Effekte für später aufschieben

Geschätzte Umsetzungszeit (mein Vorschlag): ~7h für MVP, ~10h für vollständiges Redesign.
