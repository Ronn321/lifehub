# PAGES_NOTION_REDESIGN_PLAN.md

# LifeHub – Pages Domain: Notion-ähnliches Redesign

Version: 1.0
Erstellt: 2026-06-30
Status: Plan

---

## Ziel

Die Pages Domain von LifeHub soll von einer grundlegenden Block-Editor-Implementierung zu einer vollständigen, Notion-ähnlichen UX weiterentwickelt werden. Der Fokus liegt auf:

1. Visuelle Aufwertung (Header, Icons, Cover, Breadcrumbs)
2. Intuitive Bedienung (Slash-Commands, Drag & Drop, Inline-Menus)
3. Reichere Block-Typen (Todo, Toggle, Callout, Quote, Code, Bookmark)
4. Tabellen mit Excel-Funktionen
5. Verlinkte Seiten (Page-References)

---

## Ausgangslage

### Was existiert (Review-Stand)

| Komponente | Status | Details |
|------------|--------|---------|
| **Backend** | ✅ fertig | Page CRUD, Block CRUD, Reorder, Events |
| **DB** | ✅ fertig | `pages` + `page_blocks` Tabellen, JSONB content |
| **TipTap** | ✅ installiert | react, starter-kit, extension-placeholder, extension-image |
| **Frontend** | ⚠️ basis | Tree-Liste, Basic TipTap, Media Picker |

### Was fehlt (Notion-Lücke)

| Feature | Notion | LifeHub aktuell |
|---------|--------|-----------------|
| Seiten-Icon (Emoji) | ✅ | ❌ (Feld im Entity, UI fehlt) |
| Cover-Bild (Banner) | ✅ | ❌ (Feld im Entity, UI fehlt) |
| Inline Description | ✅ | ❌ (nur im Edit-Dialog) |
| Breadcrumb-Navigation | ✅ | ❌ |
| Slash-Command Menu (`/`) | ✅ | ❌ |
| Inline Block-Handle (6-Punkte) | ✅ | ❌ (nur Pfeile) |
| Drag & Drop Reorder | ✅ | ❌ (nur Pfeile) |
| Todo-Block | ✅ | ❌ |
| Toggle-Block (einklappbar) | ✅ | ❌ |
| Callout-Block | ✅ | ❌ |
| Quote-Block | ✅ | ❌ |
| Code-Block | ✅ | ❌ |
| Bookmark-Block | ✅ | ❌ |
| Table-Block | ✅ | ❌ |
| Excel-Funktionen (SUM, etc.) | ✅ | ❌ |
| Page-References | ✅ | ❌ |

---

## Architektur-Entscheidungen

### Keine Backend-Änderungen nötig

Die JSONB-Speicherung in `page_blocks.content` ist flexibel genug für alle neuen Block-Typen. Das Backend akzeptiert beliebiges JSON im `content`-Feld. Alle neuen Block-Typen werden rein im Frontend implementiert.

### Frontend-Aufteilung

```
apps/frontend/src/app/(dashboard)/pages/
├── page.tsx                          # Hauptseite (Liste + Detail)
├── components/
│   ├── PageHeader.tsx                # Icon, Cover, Description, Breadcrumb
│   ├── BlockEditor.tsx               # Block-Renderung + Editierung (HUB)
│   ├── SlashCommandMenu.tsx          # / Command Menu
│   ├── BlockHandle.tsx               # 6-Punkte Handle + Dropdown
│   ├── DragDropContainer.tsx         # DnD Wrapper
│   ├── blocks/
│   │   ├── HeadingBlock.tsx          # (bestehend, Refactor)
│   │   ├── TextBlock.tsx             # (bestehend, Refactor)
│   │   ├── ImageBlock.tsx            # (bestehend, Refactor)
│   │   ├── GalleryBlock.tsx          # (bestehend, Refactor)
│   │   ├── FileListBlock.tsx         # (bestehend, Refactor)
│   │   ├── DividerBlock.tsx          # (bestehend, Refactor)
│   │   ├── TodoBlock.tsx             # NEU
│   │   ├── ToggleBlock.tsx           # NEU
│   │   ├── CalloutBlock.tsx          # NEU
│   │   ├── QuoteBlock.tsx            # NEU
│   │   ├── CodeBlock.tsx             # NEU
│   │   ├── BookmarkBlock.tsx         # NEU
│   │   ├── TableBlock.tsx            # NEU
│   │   └── PageReferenceBlock.tsx    # NEU
│   └── tips/
│       ├── SlashCommand.ts           # TipTap Extension
│       └── table-functions.ts        # Excel-Berechnungen
```

### NPM-Pakete (Frontend)

**Bestehend (bereits installiert):**
- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-placeholder`
- `@tiptap/extension-image`

**Neu installieren:**
```
@dnd-kit/core              # Drag & Drop
@dnd-kit/sortable          # Sortable Wrapper
@dnd-kit/utilities         # DnD Utilities
emoji-picker-react         # Emoji-Picker für Icons
prismjs                    # Syntax-Highlighting für Code-Blöcke
```

**Optional (für erweiterte Tabellen):**
```
@tiptap/extension-table
@tiptap/extension-table-row
@tiptap/extension-table-cell
@tiptap/extension-table-header
```

---

## Phasen-Plan

### Phase 1: Notion-Grundgerüst

#### 1.1 NPM-Pakete installieren

```bash
cd apps/frontend
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities emoji-picker-react prismjs
pnpm add -D @types/prismjs
```

#### 1.2 PageHeader.tsx (NEU)

**Funktionen:**
- **Emoji-Picker:** Klick auf Seiten-Icon → Popup mit `emoji-picker-react` → Auswahl wird via `PUT /api/v1/pages/:id` gespeichert
- **Cover-Bild:** Button "Cover hinzufügen" → Media-Picker → Bild als vollbreites Header-Bild (Höhe: 200px, `object-cover`)
- **Inline Description:** Direkt unter dem Titel, Placeholder "Beschreibung hinzufügen...", Focus → Editiermodus, Blur → Speichern
- **Breadcrumb:** `Seiten > Elternseite > Aktuelle Seite` mit Links zu Elternseiten

**UI-Spec (Notion-Referenz):**
```
┌─────────────────────────────────────────────────┐
│ 📂 Seiten > Elternseite > Aktuelle Seite        │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │        [Cover-Bild: 200px Höhe]             │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  [Icon]  Aktuelle Seite                           │
│          Beschreibung hinzufügen...               │
│                                                   │
└─────────────────────────────────────────────────┘
```

#### 1.3 BlockHandle.tsx (NEU)

**Funktionen:**
- Hover über Block → 6-Punkte-Handle erscheint links (mit `opacity-0 → opacity-100` Transition)
- Klick auf Handle → Dropdown-Menü:
  - Block-Typ ändern (Untermenü mit allen Typen)
  - Block duplizieren
  - Block löschen
  - Block nach oben verschieben
  - Block nach unten verschieben

**UI-Spec:**
```
  ⋮⋮  [Block-Inhalt]
  ┌──────────────┐
  │ Text         │
  │ Überschrift  │
  │ Aufzählung   │
  │ ──────────── │
  │ Duplizieren  │
  │ Löschen      │
  │ ──────────── │
  │ Nach oben    │
  │ Nach unten   │
  └──────────────┘
```

#### 1.4 DragDropContainer.tsx (NEU)

**Funktionen:**
- `@dnd-kit/core` + `@dnd-kit/sortable` Wrapper
- Sortable-Item pro Block (nutzt BlockHandle als Drag-Handle)
- Visuelles Feedback: Ghost-Element beim Ziehen, Drop-Zone Highlight
- `onDragEnd` → PUT `/api/v1/pages/:id/blocks/reorder` mit neuer Reihenfolge

**Integration in page.tsx:**
```tsx
<DragDropContainer blocks={blocks} onReorder={handleReorder}>
  {blocks.map(block => (
    <SortableBlock key={block.id} block={block}>
      <BlockEditor block={block} ... />
    </SortableBlock>
  ))}
</DragDropContainer>
```

#### 1.5 page.tsx (EDIT)

**Änderungen:**
- `PageHeader` über dem Block-Bereich einbinden
- Block-Liste in `DragDropContainer` wrappen
- `BlockHandle` pro Block renderen
- Block-Adding-Menu durch Slash-Command-Trigger ersetzen (optional: beides beibehalten)

---

### Phase 2: Neue Block-Typen

#### 2.1 TodoBlock.tsx (NEU)

**Content-Schema:**
```typescript
{ checked: boolean; text: string }
```

**UI:**
```
  ☐ Einkaufen gehen
  ☑ Arzttermin
  ☐ Auto waschen
```

- Checkbox links (Click → toggle `checked`)
- Text bei `checked: true` → `line-through text-fg-muted`
- Enter → neuen Todo-Block erstellen
- Backspace bei leerem Todo → Block löschen

#### 2.2 ToggleBlock.tsx (NEU)

**Content-Schema:**
```typescript
{ label: string; children: string; isOpen: boolean }
```

**UI:**
```
  ▶ Abschnitt 1
  ▼ Abschnitt 2
    [Inhalt hier...]
```

- Chevron (▶/▼) links, Click → `isOpen` togglen
- Label fett, Children (TipTap JSON) darunter
- Animation: `max-height` Transition beim Ein-/Ausklappen

#### 2.3 CalloutBlock.tsx (NEU)

**Content-Schema:**
```typescript
{ icon: string; variant: 'info' | 'warning' | 'error' | 'success'; text: string }
```

**UI:**
```
  ┌─────────────────────────────────┐
  │ 💡 Dies ist ein Callout-Block   │
  └─────────────────────────────────┘
```

- Icon links (wählbar: 💡, ⚠️, ❌, ✅, 🔔, etc.)
- Farbiger Hintergrund je nach Variant:
  - info: `bg-blue-50 dark:bg-blue-950`
  - warning: `bg-yellow-50 dark:bg-yellow-950`
  - error: `bg-red-50 dark:bg-red-950`
  - success: `bg-green-50 dark:bg-green-950`

#### 2.4 QuoteBlock.tsx (NEU)

**Content-Schema:**
```typescript
{ text: string }
```

**UI:**
```
  ┃ "Zitat hier..."
  ┃ — Autor
```

- Linke Border (2px, `border-brand-500`)
- Grauer Hintergrund (`bg-zinc-50 dark:bg-zinc-900`)
- Text in italic

#### 2.5 CodeBlock.tsx (NEU)

**Content-Schema:**
```typescript
{ language: string; code: string }
```

**UI:**
```
  ┌─────────────────────────────────┐
  │ javascript        [📋 Copy]     │
  │─────────────────────────────────│
  │ const foo = 'bar';              │
  │ console.log(foo);               │
  └─────────────────────────────────┘
```

- Dropdown für Sprache (JavaScript, TypeScript, Python, HTML, CSS, JSON, etc.)
- Syntax-Highlighting via `prismjs`
- Copy-to-Clipboard Button oben rechts
- Monospace-Font (`font-mono`)

#### 2.6 BookmarkBlock.tsx (NEU)

**Content-Schema:**
```typescript
{ url: string; title?: string; description?: string; image?: string }
```

**UI:**
```
  ┌─────────────────────────────────┐
  │ [Bild-Vorschau]                 │
  │ Titel der Seite                 │
  │ Beschreibung der Seite...       │
  │ example.com                     │
  └─────────────────────────────────┘
```

- URL eingeben → Fetch via API-Route (`/api/bookmark-preview?url=...`)
- Vorschau: Bild, Titel, Beschreibung, Domain
- Klick → öffnet Link in neuem Tab

#### 2.7 SlashCommandMenu.tsx + SlashCommand.ts (NEU)

**TipTap Extension:**
- Registriert Input-Listener für `/`
- Bei `/` → Suggestion-Plugin zeigt Dropdown
- Keyboard-Navigation: Pfeiltasten + Enter
- Auswahl → ersetzt `/` mit neuem Block

**Menu-Inhalte:**
```
Text
Überschrift 1
Überschrift 2
Überschrift 3
Aufzählung
Nummerierte Liste
Todo
─── Medien ───
Bild
Galerie
Dateiliste
─── Struktur ───
Trenner
Tabellen
Callout
Zitat
Code
Toggle
Bookmark
Seiten-Verweis
```

---

### Phase 3: Tabellen & Verlinkungen

#### 3.1 TableBlock.tsx (NEU)

**Content-Schema:**
```typescript
{
  columns: Array<{ id: string; name: string; type: 'text' | 'number' | 'date' }>;
  rows: Array<{ id: string; cells: Record<string, string> }>;
  functions: Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>;
}
```

**UI:**
```
  ┌────────────┬────────────┬────────────┐
  │ Name       │ Preis      │ Menge      │
  ├────────────┼────────────┼────────────┤
  │ Tomaten    │ 2.50       │ 3          │
  │ Mozzarella │ 3.80       │ 1          │
  │ Basilikum  │ 1.20       │ 2          │
  ├────────────┼────────────┼────────────┤
  │ SUMME      │ 7.50       │ 6          │
  └────────────┴────────────┴────────────┘
```

- Spalten hinzufügen/entfernen (Dropdown im Spalten-Header)
- Zeilen hinzufügen/entfernen (Button unten)
- Zellen-Editor: Doppelklick → Input
- Spalten-Typ: beeinflusst Formatierung (Zahlen rechtsbündig, etc.)

#### 3.2 table-functions.ts (NEU)

**Verfügbare Funktionen:**
```typescript
type TableFunction = 'sum' | 'avg' | 'min' | 'max' | 'count';

function calculateFunction(
  values: string[],
  type: TableFunction
): string {
  const nums = values.map(Number).filter(n => !isNaN(n));
  switch (type) {
    case 'sum':  return nums.reduce((a, b) => a + b, 0).toFixed(2);
    case 'avg':  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
    case 'min':  return Math.min(...nums).toFixed(2);
    case 'max':  return Math.max(...nums).toFixed(2);
    case 'count': return nums.length.toString();
  }
}
```

- Footer-Zeile pro Spalte mit Dropdown: Funktion wählen
- Ergebnis wird live berechnet
- Ergebnis-Text: `SUM: 7.50`, `AVG: 2.50`, etc.

#### 3.3 PageReferenceBlock.tsx (NEU)

**Content-Schema:**
```typescript
{ pageId: string }
```

**UI:**
```
  ┌─────────────────────────────────┐
  │ 📄 Reise nach Italien           │
  │ Urlaubsplanung für Juni 2025    │
  └─────────────────────────────────┘
```

- Seiten-Auswahl: Dropdown mit allen Seiten des Users
- Vorschau: Icon, Titel, Description der verlinkten Seite
- Klick → navigiert zur verlinkten Seite

---

## Block-Typ-Registrierung

Alle Block-Typen werden in `BlockEditor.tsx` registriert:

```typescript
const BLOCK_COMPONENTS: Record<string, React.ComponentType<BlockProps>> = {
  heading: HeadingBlock,
  text: TextBlock,
  image: ImageBlock,
  gallery: GalleryBlock,
  'file-list': FileListBlock,
  divider: DividerBlock,
  todo: TodoBlock,
  toggle: ToggleBlock,
  callout: CalloutBlock,
  quote: QuoteBlock,
  code: CodeBlock,
  bookmark: BookmarkBlock,
  table: TableBlock,
  'page-reference': PageReferenceBlock,
};
```

---

## Verifikation

### Phase 1
- [ ] Icon-Picker zeigt Emoji-Auswahl an
- [ ] Cover-Bild wird als Banner angezeigt
- [ ] Description ist inline editierbar
- [ ] Breadcrumb zeigt Hierarchie an
- [ ] Drag & Drop funktioniert smooth
- [ ] Block-Handle erscheint bei Hover
- [ ] `pnpm --filter @lifehub/frontend typecheck` grün
- [ ] `pnpm --filter @lifehub/frontend lint` grün

### Phase 2
- [ ] `/` öffnet Slash-Command Menu
- [ ] Alle neuen Block-Typen lassen sich erstellen
- [ ] Todo-Checkbox funktioniert (check/uncheck)
- [ ] Toggle klappt ein/aus
- [ ] Code-Block hat Syntax-Highlighting
- [ ] Bookmark zeigt Link-Vorschau
- [ ] `pnpm --filter @lifehub/frontend typecheck` grün
- [ ] `pnpm --filter @lifehub/frontend lint` grün

### Phase 3
- [ ] Tabelle: Spalten/Zeilen hinzufügen
- [ ] Tabelle: Zellen editieren
- [ ] SUM/AVG berechnet korrekt
- [ ] Page-Reference zeigt verlinkte Seite an
- [ ] `pnpm --filter @lifehub/frontend typecheck` grün
- [ ] `pnpm --filter @lifehub/frontend lint` grün

---

## Risiken & Offene Fragen

| Risiko | Impact | Gegenmaßnahme |
|--------|--------|---------------|
| `@dnd-kit` Konflikt mit TipTap | Medium | Drag-Handle nur außerhalb des Editors aktivieren |
| Performance bei vielen Blöcken | Niedrig | Virtualisierung prüfen (react-window) |
| Bookmark-Preview CORS | Mittel | Serverseitige API-Route (`/api/bookmark-preview`) |
| Emoji-Picker Bundle-Größe | Niedrig | Lazy-Loading bei Bedarf |

---

## Änderungshistorie

| Datum | Autor | Änderung |
|-------|-------|----------|
| 2026-06-30 | Agent | Plan erstellt |
