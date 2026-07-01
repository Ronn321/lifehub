# Dashboard Grid Design Prompt

## Ziel
Entwirf ein detailliertes Konzept für ein **verbessertes Dashboard-Grid-System** in LifeHub. Das Dashboard soll Widgets in einem flexiblen Raster darstellen, das Drag & Drop sowie Resize unterstützt.

## IST-Zustand (Code-Analyse)

### Aktuelle Dashboard-Seite
- `apps/frontend/src/app/(dashboard)/dashboard/page.tsx` — 834 Zeilen
- Statisches CSS-Grid: `gridTemplateColumns: 'repeat(4, 1fr)'`, kein Drag & Drop
- Widgets haben `x, y, w, h` (Spalten/Zeilen-Position), aber werden nicht interaktiv verschoben
- 4 Widget-Typen: Media (Diashow), Weather (Open-Meteo), Calendar (Monatskalender), Savings (Stub)
- Layout wird via `PUT /api/v1/dashboard/layout` persistiert (pro User)
- Widget-Größen definiert durch `gridColumn: 'span ${widget.w}'`, `gridRow: 'span ${widget.h}'`
- `minHeight: widget.h * 120px` für Mindesthöhe
- Keine Resize-Funktionalität, keine Drag & Drop
- User bekommt "Widgets anordnen per Drag & Drop in Phase 2" angezeigt

### Stack & Constraints
- **Next.js 14** (App Router), **TypeScript strict**, **Tailwind CSS 3**, **shadcn/ui** (vorhanden)
- **TanStack Query** für API-Aufrufe, **Zustand** für State
- **KEINE neuen npm-Pakete** (kein react-grid-layout, kein react-dnd, kein Framer Motion)
- Nur Tailwind + Custom CSS + React-DnD-native (HTML5 Drag & Drop API) oder Touch-Events
- **Brand**: Amber (#D97706), Dark Theme Default, Inter-Font
- **UI-Sprache**: Deutsch
- **Backend**: NestJS auf Port 3007, Endpoint `PUT /api/v1/dashboard/layout`
- **Backend-Domain** `domains/dashboard/` hat bereits `DashboardLayout` mit `widgets[]` (id, type, x, y, w, h, config)

### Tailwind Config (Colors)
- `bg`, `bg-surface`, `bg-raised` (dunkle Töne im Dark Mode)
- `fg`, `fg-muted`, `fg-subtle` (Textfarben)
- `border`, `border-strong`
- `brand-500` = #D97706 (Amber)
- `success`, `warning`, `danger`, `info`

### Globals.css Utility-Klassen
- `.bg-bg`, `.bg-bg-surface`, `.bg-bg-raised`
- `.text-fg`, `.text-fg-muted`, `.text-fg-subtle`
- `.border-border`, `.border-border-strong`
- `.glass` — Glassmorphism-Effekt

### Aktuelles Grid-System (page.tsx Zeilen 768-833)
```tsx
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '1rem',
} as React.CSSProperties;
```

Jedes Widget:
```tsx
<div style={{
  gridColumn: `span ${widget.w}`,
  gridRow: `span ${widget.h}`,
  minHeight: widget.h * 120 + 'px',
}}>
```

## Anforderungen

### 1. Grid-System (CSS Grid mit fester Spaltenzahl)
- **6 Spalten** (nicht 4!) auf Desktop (≥1024px)
- **4 Spalten** auf Tablet (≥768px)
- **2 Spalten** auf Mobile (<768px)
- **1 Spalte** auf Small Mobile (<480px)
- Widgets spannen über `w` Spalten und `h` Zeilen
- Raster-Zellen haben ein festes Seitenverhältnis (z.B. 1:1 quadratisch), damit Widgets konsistent aussehen
- Lücken zwischen Widgets: 16px (Tailwind gap-4)

### 2. Widget-Größen (erlaubte Kombinationen)
Widgets müssen immer in das Raster passen. Erlaubte Breiten (w):
- **1×1** (kleinste Einheit, z.B. für Sparziele)
- **1×2** (schmales, hohes Widget)
- **2×2** (quadratisch, z.B. Kalender)
- **2×3** (leicht rechteckig, z.B. Medien)
- **3×2** (breit, z.B. Wetter erweitert)
- **3×3** (großes Quadrat)
- **4×1** (quer, breit)
- **4×2** (breites Rechteck, z.B. Medien-Diashow)
- **4×3** (sehr breit)
- **6×1** (volle Breite, sehr flach)
- **6×2** (volle Breite, z.B. großer Kalender)
- **6×3** (volle Breite, hoch)
- **6×4** (vollflächig)

### 3. Drag & Drop (Browser-nativ, kein Lib)
- HTML5 Drag & Drop API (`onDragStart`, `onDragOver`, `onDrop`)
- Widgets können innerhalb des Grids verschoben werden
- Beim Drag: visuelles Feedback (Opazität, Schatten, Skalierung)
- Drop-Target: andere Widgets schieben sich zur Seite (kein Austausch, sondern "Platz machen")
- Nach Drop: Layout wird via PUT `/dashboard/layout` persistiert

### 4. Resize (Ziehgriff Ecke unten-rechts)
- Jedes Widget hat einen Resize-Handle (unten-rechts, diagonales Icon)
- Ziehgriff nur sichtbar bei Hover (opacity 0 → 1)
- Resize ändert `w` und `h` des Widgets
- Snapping an Raster-Größen (nicht stufenlos, sondern in ganzen Spalten/Zeilen)
- Min-Größe: 1×1, Max-Größe: 6×4 (begrenzt durch verfügbaren Platz)
- Nach Resize: Layout wird persistiert

### 5. Responsive Design
- Mobile: Widgets stapeln vertikal (2 oder 1 Spalte)
- Widgets behalten ihre Größenverhältnisse, werden aber schmaler
- Touch-Support für Drag & Drop auf Mobilgeräten

### 6. Visuelles Design
- Widgets haben `rounded-xl`, `border border-border`, `bg-bg-surface`
- Widget-Header mit Icon + Titel + Settings-Button (nur bei Hover sichtbar)
- Drag-Handle am Header (GripVertical-Icon, links neben Titel bei Hover)
- Leere Plätze im Grid zeigen dezenten gestrichelten Rand ("Widget hier ablegen")
- Glatter Übergang bei Größenänderungen (`transition-all duration-200`)
- Dark Mode voll unterstützt

### 7. Widget-Menü (pro Widget)
- Settings-Icon (Zahnrad) → öffnet SettingsPanel (bereits implementiert)
- Löschen-Icon (Trash2) → entfernt Widget aus Layout
- Minimieren/Vollbild (optional, Phase 2)

### 8. Widgets hinzufügen
- Button "Widget hinzufügen" rechts oben im Header
- Öffnet Dropdown/Modal mit verfügbaren Widget-Typen (Icon + Name)
- Neues Widget wird an der ersten freien Position platziert
- Standardgrößen pro Widget-Typ:
  - media: 4×2
  - weather: 3×2
  - calendar: 3×2
  - savings: 1×1

## Ausgabe-Format
Schreibe dein Design-Dokument nach `C:\Users\Robert_D_AZ_1\Documents\LifeHub\designs\dashboard_grid_{MODEL}_v1.md`

Das Dokument MUSS enthalten:
1. **Komponenten-Architektur**: Welche neuen/geänderten Komponenten? Dateinamen, Props, State
2. **Grid-Logik**: Wie wird das Grid berechnet? CSS-Code, responsive Breakpoints
3. **Drag & Drop**: HTML5-DnD-Implementierung, Event-Handler, State-Management
4. **Resize**: Resize-Handle, Maus/Touch-Events, Snapping
5. **Konkrete Tailwind-Klassen**: Exakte CSS-Klassen für jede Komponente
6. **TypeScript-Interfaces**: Alle neuen Types
7. **API-Integration**: Wie wird das Layout geladen/gespeichert? Optimistic Updates?
8. **State-Management**: Welcher State in Komponente vs. Zustand vs. TanStack Query?
9. **Edge Cases**: Leeres Layout, ein Widget, viele Widgets, Mobile, Touch
10. **Was NICHT implementiert wird**: Phase-2-Ausgrenzungen
