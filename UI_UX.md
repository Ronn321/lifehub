# UI_UX.md

# LifeHub – Design System & UX Vision

Version: 1.0
Inspiration: https://github.com/voltagent/awesome-design-md

---

## 1. Design-Prinzipien

LifeHub folgt fünf nicht verhandelbaren Design-Prinzipien:

1. **Ruhig vor laut** — viel Weißraum (oder Dark-Space), keine lauten Farben, keine Spielereien.
2. **Inhalt vor Chrom** — die Daten sind der Star, die UI tritt zurück.
3. **Konsistenz über Kreativität** — gleiche Interaktion an gleicher Stelle, immer.
4. **Schnell wirken** — jede Interaktion < 100 ms Feedback, Animationen < 250 ms.
5. **Mobile first, Desktop optimiert** — am Handy nutzbar, am großen Bildschirm ein Erlebnis.

Referenz-Level: Apple (Photos, Notes, Reminders) für Core UX, Notion für Dichte, Netflix/Jellyfin für Medien, Google Photos für Galerie, Linear für Listen-Interaktionen.

---

## 2. Design-Tokens (verbindlich)

### 2.1 Farbpalette

Dark Mode ist **Default** (NAS-Server laufen oft in dunklen Räumen, augenfreundlich nachts).

**Brand-Akzent (wählbar pro Instanz, Default: Amber)**

```css
/* Light Mode */
--brand-50:  #FFF8EB;
--brand-100: #FEEBC7;
--brand-200: #FBD38D;
--brand-300: #F6AD55;
--brand-400: #ED8936;
--brand-500: #DD6B20;     /* Primary */
--brand-600: #C05621;
--brand-700: #9C4221;
--brand-800: #7B341E;
--brand-900: #652B19;

/* Dark Mode */
--brand-50:  #1A1208;
--brand-100: #2D1F0A;
--brand-200: #4A3414;
--brand-300: #6E4E1E;
--brand-400: #94652A;
--brand-500: #D97706;     /* Primary */
--brand-600: #F59E0B;
--brand-700: #FBBF24;
--brand-800: #FCD34D;
--brand-900: #FDE68A;
```

**Neutral**

```css
/* Light */
--neutral-0:   #FFFFFF;
--neutral-50:  #FAFAFA;
--neutral-100: #F4F4F5;
--neutral-200: #E4E4E7;
--neutral-300: #D4D4D8;
--neutral-400: #A1A1AA;
--neutral-500: #71717A;
--neutral-600: #52525B;
--neutral-700: #3F3F46;
--neutral-800: #27272A;
--neutral-900: #18181B;
--neutral-1000: #09090B;

/* Dark */
--neutral-0:   #09090B;
--neutral-50:  #18181B;
--neutral-100: #27272A;
--neutral-200: #3F3F46;
--neutral-300: #52525B;
--neutral-400: #71717A;
--neutral-500: #A1A1AA;
--neutral-600: #D4D4D8;
--neutral-700: #E4E4E7;
--neutral-800: #F4F4F5;
--neutral-900: #FAFAFA;
--neutral-1000: #FFFFFF;
```

**Semantisch**

```css
--success: #16A34A;
--warning: #F59E0B;
--danger:  #DC2626;
--info:    #2563EB;
```

### 2.2 Typografie

```css
--font-sans:  "Inter", system-ui, -apple-system, sans-serif;
--font-mono:  "JetBrains Mono", ui-monospace, monospace;
--font-display: "Inter Display", "Inter", sans-serif;

--text-xs:   0.75rem;   /* 12px */
--text-sm:   0.875rem;  /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg:   1.125rem;  /* 18px */
--text-xl:   1.25rem;   /* 20px */
--text-2xl:  1.5rem;    /* 24px */
--text-3xl:  1.875rem;  /* 30px */
--text-4xl:  2.25rem;   /* 36px */
--text-5xl:  3rem;      /* 48px */
--text-6xl:  3.75rem;   /* 60px */
```

Headlines: `font-display`, weight 600–700, letter-spacing -0.02em.
Body: weight 400, line-height 1.6.
Mono: nur Code, Pfade, IDs.

### 2.3 Spacing & Radii

```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-12: 3rem;
--space-16: 4rem;
--space-24: 6rem;

--radius-sm: 0.25rem;
--radius:    0.5rem;
--radius-md: 0.75rem;
--radius-lg: 1rem;
--radius-xl: 1.5rem;
--radius-2xl: 2rem;
--radius-full: 9999px;
```

### 2.4 Schatten & Glassmorphism

```css
/* Light */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow:    0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
--shadow-md: 0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.06);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04);

/* Glassmorphism (für Overlays, Modals, Sidebar) */
--glass-bg:       rgba(255,255,255,0.7);
--glass-bg-dark:  rgba(9,9,11,0.7);
--glass-blur:     saturate(180%) blur(20px);
--glass-border:   1px solid rgba(255,255,255,0.18);
--glass-border-dark: 1px solid rgba(255,255,255,0.08);
```

### 2.5 Motion

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--duration-fast: 150ms;
--duration: 250ms;
--duration-slow: 400ms;
```

---

## 3. Komponenten-Bibliothek (shadcn-basiert)

Basis: shadcn/ui + Radix Primitives + Tailwind.
Erweiterungen: eigene `components/ui/lifehub/...` Wrapper.

| Komponente | Variante | Verwendung |
|------------|----------|------------|
| `Button` | primary, secondary, ghost, outline, destructive, icon | überall |
| `Card` | default, glass, bordered, hover-lift | Listen, Detail |
| `Dialog` | default, fullscreen, sheet | Modals |
| `Sheet` | left, right, top, bottom | Detail-Panels, Mobile-Nav |
| `Dropdown` | default, combobox, multi | Filter, Aktionen |
| `Tabs` | underline, pill, vertical | Sub-Navigation |
| `Avatar` | image, initials, group | User, Owner |
| `Badge` | default, success, warning, danger, info, brand | Status, Tags |
| `Toast` | success, error, info, warning | Feedback |
| `Skeleton` | text, circle, card | Loading |
| `EmptyState` | icon, title, description, action | leere Listen |
| `Breadcrumb` | default, with-icons | Navigation |
| `Command` | default, with-shortcuts | globale Suche ⌘K |
| `Tooltip` | default, rich, side | Hints |
| `Progress` | linear, circular | Uploads, Sparziele |
| `DataTable` | sortable, filterable, paginated | Listen |
| `MediaCard` | image, video, with-overlay, with-actions | Galerie, Jellyfin |
| `Timeline` | vertical, horizontal, grouped | Aktivitäten, Medien |
| `Map` | static, clustered, with-route | Reisen, Media |
| `Globe` | 3D | Media, Reisen |
| `Calendar` | month, week, day, agenda | Termine |
| `Kanban` | default, with-drag | Projekte (Phase 3) |
| `Chart` | line, bar, pie, area | Finanzen |

### 3.1 Iconographie

- **Lucide Icons** (Default)
- **Phosphor** als Alternative für reichere Sets
- Niemals Emojis als Funktions-Icons

---

## 4. Layout-System

### 4.1 Grid

12-Spalten auf Desktop, 4 auf Tablet, 2 auf Mobile.
Gutter: 24px Desktop, 16px Mobile.
Max-Content-Width: 1440px.

### 4.2 App-Shell

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar (64px)                                                │
│  ┌──┐                                                         │
│  │☰│  Logo    Search ⌘K                  User ▾  Notif  Theme│
│  └──┘                                                         │
├──────┬───────────────────────────────────────────────────────┤
│      │                                                        │
│ Side │  Main Content                                          │
│ bar  │  (Breadcrumb + Page)                                   │
│      │                                                        │
│ 240px│  ─────────────────────────────────────────            │
│      │                                                        │
│      │  Content                                              │
│      │                                                        │
│      │                                                        │
│      │                                                        │
│      │                                                        │
└──────┴───────────────────────────────────────────────────────┘
```

### 4.3 Sidebar (Desktop, ≥1024px)

- Breite 240px, einklappbar auf 64px (Icon-Only)
- Glassmorphism-Background mit `backdrop-blur-xl`
- Domain-Items mit Icon + Label
- Aktives Item: 2px Brand-Akzent links, leicht erhöhter Hintergrund
- Sub-Items ausklappbar mit `Accordion`
- Footer: Theme-Toggle + Einstellungen (User-Status/Logout seit 08/2026 unter `Einstellungen → Allgemein → Konto`)

**Music-Sidebar (Jellyfin):** Stil der eingeklappten Sidebar ist unter `Einstellungen → Darstellung` wählbar (persistiert in `jellyfin-layout`-Store):
- **Klassisch** — eingeklappt: Icons sichtbar, runder Toggle-Knopf an der Sidebar-Grenze (`absolute -right-3`)
- **Spotify** — eingeklappt: Toggle-Button oben in der Sidebar
- **Kollisionsschutz:** Ist die LifeHub-Sidebar eingeklappt (Event `lifehub:sidebar-collapse`), rutscht der Music-Toggle auf `top-16`/`pt-16` — beide Grenz-Knöpfe überlappen sich nie.

### 4.4 Mobile (<768px)

- Sidebar wird zu **Bottom-Tab-Bar** (5 sichtbare Domains, Rest hinter „Mehr")
- Topbar: Burger-Icon links, Logo mittig, Aktionen rechts
- Sheets statt Dialogs
- Sticky-Header in Listen mit Filter-Chips

### 4.5 Tablet (768–1023px)

- Sidebar collapsed (Icons only, 64px)
- Topbar voll
- Content 2-Spalten wo sinnvoll

### 4.6 Seiten-Layout-Modi (Pages-Domain, Notion-Stil)

Seiten in `apps/frontend/src/app/(dashboard)/pages/` unterstützen drei Layout-Modi:

| Modus | Container | Sidebar | Auslöser |
|-------|-----------|---------|----------|
| `normal` | `max-w-3xl` (768px) | sichtbar (256px) | Standard, Toggle „Volle Breite" aus |
| `wide` | `max-w-none` (volle Hauptbereichs-Breite) | sichtbar (256px) | Toggle „Volle Breite" oder BrowserBlock „Medium" |
| `fullscreen` | `max-w-none` | eingeklappt (64px) | BrowserBlock „Vollbild" |

- „Volle Breite"-Toggle in der Seiten-Toolbar (neben „Versionen"), Persistenz pro Seite via `localStorage['lifehub-page-wide:<pageId>']`.
- BrowserBlock-Modi „Medium"/„Vollbild" senden `lifehub:browser-layout`-CustomEvents; die Seite reagiert mit Layout-Wechsel, die Sidebar auf `lifehub:sidebar-collapse`.
- Cover nimmt im wide/fullscreen-Modus die volle Hauptbereichs-Breite ein (negative Margins, ohne Rundung).

### 4.7 Scroll-Isolation im Remote-Browser

Der Browser-Viewport (`RemoteBrowserViewport`) nutzt einen **nativen non-passive `wheel`-Listener** (React-`onWheel` ist passiv → `preventDefault` greift nicht). Scrollen über dem Browser-Block scrollt **nur** den Remote-Browser, nie die LifeHub-Seite (`stopPropagation` + `preventDefault`).

### 4.8 Seiten-Übersicht (Notion-Stil) & Sidebar-Navigation

- **Sidebar „Seiten"**: Klick auf das Label navigiert zur Übersicht `/pages` (Chevron-Button links klappt nur die Seitenliste um). Aktiv-Zustand bei `pathname.startsWith('/pages')`.
- **PageOverview** (`pages/page.tsx`, unter dem PageHeader): zeigt auf jeder Hauptseite automatisch eine Karte mit bis zu 5 Sektionen (nur bei vorhandenem Inhalt):
  - **Unterseiten** — Seiten mit `parentId === aktuelle Seite` (klickbar, navigiert via `/pages?open=<id>`)
  - **Übergeordnete Seiten** — Parent-Kette bis zur Root (klickbar)
  - **Dokumente** — automatisch aus `file`-Blöcken (filename/mediaId) und `link`/`bookmark`-Blöcken (url)
  - **Aufgaben** — aus `todo`-Blöcken und `checklist`-Items (erledigt durchgestrichen)
  - **Zeitraum** — aus `timeline`-Blöcken, aufsteigend nach Datum sortiert
- Leere Blöcke (ohne Text/URL) werden nicht angezeigt; ohne jeglichen Inhalt verschwindet die Karte komplett.

---

## 5. Navigation (verbindliche Domain-Reihenfolge)

Die Sidebar spiegelt die **Wichtigkeit im Alltag** einer Familie, nicht die Entwicklungsreihenfolge.

```
Dashboard          (/)
Medien             (/media)
Reisen             (/travel)
Rezepte            (/recipes)
Einkaufslisten     (/shopping)
Filme & Serien     (/jellyfin)
Kalender           (/calendar)
Aufgaben           (/tasks)             — Phase 4

── Persönlich ──
Finanzen           (/finance)
Versicherungen     (/insurance)
Dokumente          (/documents)
Vault              (/vault)
Haus-IT            (/it-inventory)
Projekte           (/projects)
Wiki               (/wiki)              — Phase 2

── Admin ──
Benutzer           (/admin/users)
Einstellungen      (/admin/settings)
Plugins            (/admin/plugins)     — Phase 6
```

---

## 6. Schlüssel-Screens (Detaillayouts)

### 6.1 Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│ Guten Morgen, Robert                                          │
│ Heute ist Sonntag, 14. Juni 2026                              │
│                                                               │
│ ┌─────────────┬─────────────┬─────────────┬─────────────┐    │
│ │ Sparziel    │ Portfolio   │ Kalender    │ Wetter      │    │
│ │ Italien 65% │ €87.420 +2% │ 3 Termine   │ 22°C sonnig │    │
│ └─────────────┴─────────────┴─────────────┴─────────────┘    │
│                                                               │
│ ┌─────────────────────────┬─────────────────────────────┐    │
│ │ Letzte Fotos            │ Aktuelle Einkaufsliste       │    │
│ │ [Grid 4 Spalten]        │ • Tomaten (3)                │    │
│ │                         │ • Mozzarella                 │    │
│ │                         │ • Basilikum                  │    │
│ └─────────────────────────┴─────────────────────────────┘    │
│                                                               │
│ ┌─────────────────────────┬─────────────────────────────┐    │
│ │ Mediathek: Fortsetzen   │ Projekte-Status              │    │
│ │ [Poster-Grid]           │ • Smart Mirror  75%          │    │
│ │                         │ • Aquariensteuerung  40%     │    │
│ └─────────────────────────┴─────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

Widgets per Drag & Drop umsortierbar, Layout wird pro User persistiert.

### 6.2 Medien — Galerie (Google-Photos-Style)
```
┌──────────────────────────────────────────────────────────────┐
│ Medien › Galerie                                             │
│ ┌──┐                                                         │
│ │🔍│ Suche…                          ⌘K  [Hochladen ⊕]       │
│ └──┘                                                         │
│                                                               │
│ Ansicht: ⦿ Galerie  ○ Zeitleiste  ○ Karte  ○ Globus  ○ Alben │
│                                                               │
│ ┌─────┬─────┬─────┬─────┬─────┬─────┐                       │
│ │     │     │     │     │     │     │                       │
│ │     │     │     │     │     │     │                       │
│ ├─────┼─────┼─────┼─────┼─────┼─────┤                       │
│ │     │     │     │     │     │     │                       │
│ │     │     │     │     │     │     │                       │
│ ├─────┼─────┼─────┼─────┼─────┤     │                       │
│ │     │     │     │     │     │     │                       │
│ └─────┴─────┴─────┴─────┴─────┴─────┘                       │
│                                                               │
- Masonry-Grid, Lightbox auf Klick, Infinite-Scroll

**Pagination (implementiert 08/2026):** Galerie lädt seitenweise (`GET /media/files?limit&offset` → `{items,total}`), Seiten-Größe 25/50/100/150/200 oder eigene Zahl (persistiert in `lifehub-media-page-size`), „Seite X / Y" + Pfeile.
**Thumbnail-first:** Kacheln zeigen sofort das eingebettete Base64-Thumbnail (`thumbnailPath`); Video-Kacheln rendern `VideoPreviewTile` (Play-Platzhalter, die 5s-Vorschau mountet erst bei Hover) — keine Original-Streams beim Galerie-Laden.
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Medien — Karte (Leaflet)

- OpenStreetMap-Tiles (keine Google-Maps, Privacy)
- Cluster ab Zoom < 8
- Marker-Cluster zeigt Anzahl + Vorschaubild
- Side-Panel mit Filtern (Jahr, Album, Person)
- GPS-Heatmap-Layer als Toggle

### 6.4 Medien — Globus (Three.js)

- 3D-Earth, draggable, zoomable
- Punkte pulsieren an Foto-Locations
- Hover: Vorschau-Popover
- Klick: springt in Zeitleiste oder Album

### 6.5 Reise — Trip-Detail (eigene Landingpage)

```
┌──────────────────────────────────────────────────────────────┐
│ ← Zurück zu Reisen                                           │
│                                                               │
│ ╔══════════════════════════════════════════════════════════╗ │
│ ║                  ITALIEN 2025                             ║ │
│ ║        14.–28. Juni 2025 · Rom, Florenz, Venedig          ║ │
│ ╚══════════════════════════════════════════════════════════╝ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ [Hero-Image: Venedig bei Sonnenuntergang]               │  │
│ │                                                         │  │
│ │  [Karte mit Route]                                      │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ Tabs: [Übersicht] [Fotos 234] [Videos 12] [Notizen] [Doku]   │
│                                                               │
│ Tag-für-Tag-Timeline mit Drag-Reorder                         │
└──────────────────────────────────────────────────────────────┘
```

### 6.6 Finanzen — Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│ Finanzen                                                      │
│                                                               │
│ ┌──────────────┬──────────────┬──────────────┬─────────────┐ │
│ │ Net Worth    │ Cashflow Mts │ Sparquote    │ Monatsdiff  │ │
│ │ €187.420     │ +€2.340      │ 22%          │ -€890       │ │
│ │ ▲ 3,2%       │ ▲ 12%        │ ▲ 4pp        │ ▼ 5%        │ │
│ └──────────────┴──────────────┴──────────────┴─────────────┘ │
│                                                               │
│ ┌──────────────────────────┬─────────────────────────────┐   │
│ │ Portfolio (Donut)         │ Sparziele (Liste)            │   │
│ │      [Donut-Chart]        │ ▓▓▓▓▓▓▓▓░░  Italien 80%      │   │
│ │                           │ ▓▓▓▓░░░░░░  Auto 35%         │   │
│ │  ETFs  62%                │ ▓▓░░░░░░░░  Notgroschen 20%  │   │
│ │  Aktien 25%               │                              │   │
│ │  Anleihen 8%              │                              │   │
│ │  Krypto 3%                │                              │   │
│ │  Gold 2%                  │                              │   │
│ └──────────────────────────┴─────────────────────────────┘   │
│                                                               │
│ Letzte Buchungen (Tabelle)                                    │
└──────────────────────────────────────────────────────────────┘
```

### 6.7 Rezept-Detail

- Hero-Bild oder -Video (YouTube-Embed)
- Sticky-Sidebar mit Zutaten + Portionen-Slider
- „Auf Einkaufsliste" Button → Modal mit Listenauswahl
- Schritte nummeriert, kollabierbar, mit Timern
- Tags, Nährwerte, Quelle

### 6.8 Vault — Eintrag-Liste

- Suche + Folder-Struktur (eigene Folder, nicht OS)
- Eintrag-Detail in Side-Sheet (rechts)
- TOTP-Code mit Auto-Refresh-Countdown
- Copy-Button mit „wurde kopiert"-Toast, Auto-Clear nach 30s

### 6.9 Jellyfin — Detail

- Hero mit Backdrop, Logo, Title
- Tabs: Übersicht / Staffeln / Trailer / Ähnlich
- Staffel-Picker, Episoden-Liste mit Resume-Marker
- Cast-Chips, Rating, Genres
- „Weiterschauen"-Hero auf Mediathek-Startseite

### 6.10 Kalender (Outlook-/Google-Stil)

Redesign nach Google-Calendar/Outlook-Vorbild. **Vier Ansichten**, Kalender-Sidebar mit Sichtbarkeits-Toggles, konfigurierbarer Akzent + Hintergrundbild.

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Heute     [Monat][Woche][Tag][Agenda]          ⚙  Google-Sync  │
│ ┌──────────┬─────────────────────────────────────────────────────┐│
│ │ Meine    │  Mo 10        Di 11        Mi 12        Do 13       ││
│ │ ☑ Mein   │  ┌────────┐   ┌────────┐                 ┌────────┐ ││
│ │   Kalender│  │ ▍Arzt  │   │ ▍Standup│                 │ ▍Geburt.│ ││
│ │ ☑ Familie │  │ 09:00  │   │ 10:00  │                 │ 14:00  │ ││
│ │          │  └────────┘   └────────┘                 └────────┘ ││
│ │ Google   │                                                 ││
│ │ ☑ Arbeit │  (Chips: 2px links farbiger Balken, bg Farbe+1F) ││
│ └──────────┴─────────────────────────────────────────────────────┘│
│  Einstellungen-Panel: Akzentfarbe · Hintergrundbild · Sync-Status │
└──────────────────────────────────────────────────────────────────┘
```

- **Toolbar:** „Heute" (springt zu aktuellem Datum), View-Switcher (Monat/Woche/Tag/Agenda), Kalender-Einstellungen (Zahnrad), Google-Sync-Status/Aktion.
- **View-Switcher:** Monat (Grid), Woche (7 Spalten, Stundenraster), Tag (Tages-Raster), Agenda (chronologische Liste). Default `default_view` aus User-Settings.
- **Kalender-Sidebar:** alle Kalender mit Sichtbarkeits-Toggle (PATCH `/calendar/calendars/:id`), pro Kalender Farb-Dot; „Mein Kalender" wird automatisch als lokaler Default angelegt.
- **Event-Chip-Regeln:**
  - `borderLeft: 2px solid` in der Kalender-Farbe (farbiger Balken links).
  - Hintergrund = Kalenderfarbe mit **+1F-Alpha** (z.B. `rgb(var(--cal-500) / 0.12)`), Text in neutral-Farbe.
  - Ganztägig: voller Chip über die Tagesbreite; zeitgebunden: Chip an Position der Startzeit im Stundenraster.
  - Klick öffnet `EventDetailModal`; „Neu" öffnet `EventDialog` mit Kalender-Auswahl.
- **Akzentfarbe:** Kalender nutzt `--cal-*`-CSS-Variablen; **Default ist der Hub-Brand-Akzent** (Kein expliziter Akzent gesetzt → `--cal-*` folgt `--brand-*`).
- **Hintergrundbild-Semantik** (`CalendarBackground`):
  - `background_url` optional; gerendert als fixierter Layer hinter dem Raster.
  - `backgroundOverlay` (0.85 Default) = Opacity eines **Lesbarkeits-Overlays** `rgb(var(--bg) / overlay)` über dem Bild — höher = dunkler/gedämpfter, Text bleibt lesbar.
  - `backgroundBlur` (12px Default) = CSS `blur()` auf das Bild. Overlay + Blur zusammen garantieren Kontrast, ohne den Inhalt zu überstrahlen.
- **Google-Sync:** Verbindungsstatus, „Jetzt synchronisieren", Auswahl der zu importierenden Google-Kalender; siehe `features/calendar.feature.md`.
- **Responsive:** Monat/Woche-Ansichten auf Mobile → Agenda/Tag; Sidebar klappt zu Sheet.

### 6.11 E-Mail

Gmail-Live-Proxy im Hub (`/email`). **3-Spalten-Layout**, Ordner-Navigation, Lesebereich als sandboxed iframe.

```
┌──────────────────────────────────────────────────────────────────┐
│ E-Mail                          [Verfassen]        badge 4       │
│ ┌─────────┬────────────────────┬────────────────────────────────┐ │
│ │ Posteingang│ ▍4              │  Betreff …           ⋮         │ │
│ │ Gelesen   │  ┌─────────────┐ │  Von / An / Datum              │ │
│ │ Mit Stern │  │ Absender    │ │ ┌────────────────────────────┐ │ │
│ │ Archiv    │  │ Betreff     │ │ │ sandboxed iframe (HTML)    │ │ │
│ │ Papierkorb│  │ Snippet ▍   │ │ │                            │ │ │
│ │           │  └─────────────┘ │ └────────────────────────────┘ │ │
│ │           │  [Antworten][Weiterleiten] Anhänge: 📎 2           │ │
│ └─────────┴────────────────────┴────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

- **Layout:** 3 Spalten — links Ordner-Liste, mittig Thread-Liste, rechts Lesebereich. Auf Mobile kollabieren die Spalten in Sheets.
- **Ordner:** Posteingang, Gelesen, Archiv, Papierkorb, Gesendet (Label-Mapping INBOX/ARCHIVE/TRASH/SENT → Gmail-Query).
- **Aktionen:** Verfassen, Antworten (einfach/alle), Weiterleiten, Archivieren, Papierkorb, Als gelesen markieren. Badge mit ungelesener Posteingang-Zahl im Sidebar-Item.
- **Lesebereich:** HTML-Body in **sandboxed iframe** (`sandbox="allow-same-origin"` ohne `allow-scripts`), damit Tracking-/Schad-Skripte der Mail nicht laufen.
- **Anhänge:** Download-Link via `GET /email/messages/:id/attachments/:att`; Anzeige von Dateiname + Größe.
- **Kopplung:** erfordert verbundenes Google-Konto (Settings → Google-Konto); ohne Verbindung Empty-State mit „Jetzt verbinden".

---

## 7. Interaktions-Pattern

### 7.1 Loading

- **Skeleton** in Listen, Cards
- **Optimistic Updates** für Likes, Toggle, Toggles
- **Progress Bar** bei Uploads mit %, Geschwindigkeit, Restzeit
- **Streaming Responses** (SSE) für lange Operationen (z.B. Jellyfin-Sync)

### 7.2 Fehler

- Inline-Validierung in Forms, rot unter Feld
- Toast für transiente Fehler
- Empty-State für leere Listen (nie "Keine Daten" ohne Kontext)
- Error-Boundary pro Route mit "Erneut versuchen"

### 7.3 Tastatur

- `⌘K` / `Ctrl+K` öffnet globale Suche
- `J` / `K` Listen-Navigation (Linear-Style)
- `Esc` schließt Modals/Sheets
- `?` öffnet Shortcut-Übersicht
- Pfeiltasten in Mediathek, `Enter` spielt ab

### 7.4 Touch / Mobile

- Swipe-Back-Gesture in Detail-Views
- Pull-to-Refresh in Listen
- Long-Press für Mehrfachauswahl in Galerie
- Bottom-Sheet für Aktionen statt Dropdown

### 7.5 Accessibility (A11y)

- WCAG 2.1 AA als Mindeststandard
- Sichtbarer Focus-Ring (2px Brand-Akzent + Offset)
- Kontrast Minimum 4.5:1 für Text
- ARIA-Labels auf allen Icon-Buttons
- Skip-to-Content-Link
- Reduced-Motion respektieren (`prefers-reduced-motion`)

---

## 8. Theming

### 8.1 Modi

- **Dark** (Default)
- **Light**
- **System** (folgt OS)

### 8.2 Brand-Akzent konfigurierbar

Pro Instanz in Admin-Settings änderbar:
- Amber (Default)
- Blue
- Green
- Rose
- Violet
- Custom (HEX-Picker)

**Umsetzung (implementiert):** `Einstellungen → Darstellung` — Theme (Hell/Dunkel/System) + Akzent. Die Akzentfarbe ist Hub-weit konfigurierbar via `lib/accent.ts` (`useAccentStore`, Zustand + `persist` im `lifehub-accent`-Key): 5 Presets (Amber/Blau/Grün/Rosé/Violett) **oder** Custom-HEX-Picker. Default ist **Amber**. Das Store wird über `useAccentSync()` in `layout.tsx` angewendet: `applyAccent()` setzt die `--brand-500/400/600`-CSS-Variablen auf `:root`/`.dark` (Custom-HEX wird in ein RGB-Triplett umgewandelt; die übrigen Stufen 50–900 fallen auf Amber zurück). Tailwind-`brand`-Skala liest die CSS-Vars (`rgb(var(--brand-N) / <alpha-value>)`). Kalender nutzt einen eigenen `--cal-*`-Satelliten, der ohne explizite Einstellung dem Brand-Akzent folgt.

### 8.3 Implementation

- CSS Custom Properties auf `:root`
- Tailwind-Config liest Tokens
- `next-themes` für Mode-Switch, persistiert in `localStorage`
- Kein Flash-of-Wrong-Theme via Inline-Script in `<head>`

---

## 9. Animationen (Framer Motion)

```ts
// Page transitions
<AnimatePresence mode="wait">
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
  />
</AnimatePresence>

// List stagger
<motion.ul variants={container}>
  {items.map(item => (
    <motion.li variants={item} />
  ))}
</motion.ul>

// Sheet slide
<motion.aside
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
/>
```

Respektiere `prefers-reduced-motion`:
```ts
const shouldReduce = useReducedMotion();
<motion.div animate={shouldReduce ? {} : {...}} />
```

---

## 10. Responsive Breakpoints

```ts
sm:  640px    // Mobile landscape
md:  768px    // Tablet
lg:  1024px   // Desktop small
xl:  1280px   // Desktop
2xl: 1536px   // Desktop large
```

Layout-Shift-Matrix:

| Komponente | Mobile | Tablet | Desktop |
|------------|--------|--------|---------|
| Sidebar | Bottom-Bar | Collapsed 64px | Full 240px |
| Galerie | 2 Spalten | 3 Spalten | 4–6 Spalten |
| Finanzen-Dashboard | 1 Spalte gestapelt | 2 Spalten | 4 Widgets oben, 2 groß unten |
| Rezept-Detail | Sidebar unten, Tabs oben | Sidebar rechts, 40% | Sidebar rechts, 33% |
| Mediathek | 2 Poster | 4 Poster | 6–8 Poster |

---

## 11. Sound

- Default: **stumm**
- Optional: kurze Audio-Cues für Uploads-Complete, Vault-Copy
- Niemals Auto-Play für Musik
- Master-Toggle in Settings

---

## 12. Onboarding

Erstmaliger Login:

1. **Welcome-Screen** — "Willkommen in LifeHub"
2. **Admin-Setup** — Name, Passwort, Avatar
3. **Storage-Pfade** — NAS-Mounts verifizieren
4. **Erste Domain aktivieren** — pro Domain ein Quick-Tour-Tooltip
5. **Fertig** — Dashboard

Skippable, Fortschritt wird gespeichert.

---

## 13. UX DoD

UI ist „fertig", wenn:

- Light + Dark + alle Brand-Akzente funktionieren
- Mobile (375px), Tablet (768px), Desktop (1440px) sehen gut aus
- Tastatur-Navigation funktioniert komplett
- Screen-Reader (VoiceOver / NVDA) gibt alle Inhalte sinnvoll wieder
- Lighthouse Score ≥ 90 (Performance, A11y, Best Practices, SEO)
- Reduzierte Animation respektiert
- Kein LCP > 2.5s auf Galerie-Seite mit 1000 Bildern
- Skeleton-States überall wo Daten laden
- Empty-States mit hilfreichen Aktionen überall
