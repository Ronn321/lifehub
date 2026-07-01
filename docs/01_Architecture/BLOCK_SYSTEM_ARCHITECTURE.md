# BLOCK_SYSTEM_ARCHITECTURE.md

# LifeHub – Block System Architecture

Version: 1.0  
Status: Core Architecture

---

# 1. Ziel

Das Block-System ist das zentrale UI- und Inhaltsmodell von LifeHub.

Es ersetzt klassische Seitenlayouts durch ein modulares System aus wiederverwendbaren, frei kombinierbaren Inhaltsbausteinen.

Jede Page besteht ausschließlich aus einer geordneten Liste von Blocks.

---

# 2. Grundprinzip

Eine Page ist kein statisches Dokument.

Eine Page ist eine Container-Struktur für Blocks.

Page → Block[]

Blocks sind die kleinste funktionale Einheit im System.

---

# 3. Block Definition

Ein Block ist ein unabhängiges UI- und Datenmodul mit klar definiertem Lebenszyklus.

Jeder Block besitzt:

- id
- type
- props (Daten)
- layout (optional)
- permissions
- metadata
- version
- createdAt
- updatedAt

---

# 4. Block Typen

## 4.1 Core Block Types

- markdown
- image
- gallery
- video
- file
- link
- embed
- table
- spreadsheet
- checklist
- timeline
- map
- code
- divider

---

## 4.2 System Blocks

- page_reference
- media_library
- calendar_view
- finance_widget
- it_inventory_widget
- jellyfin_player

---

## 4.3 Future / Plugin Blocks

- research_workspace
- ai_summary
- knowledge_graph
- automation
- external_api_view

---

# 5. Block Lebenszyklus

created → updated → moved → rendered → archived → deleted

Keine destruktiven Updates. Jede Änderung erzeugt Versionierung.

---

# 6. Rendering Pipeline

1. Load Page
2. Load Blocks
3. Resolve Block Types
4. Fetch Data
5. Apply Permissions
6. Render UI
7. Attach Client Interactions

---

# 7. Layout System

- vertikale Standardanordnung
- optionale Spalten
- responsive Pflicht
- keine festen Page-Layouts

---

# 8. Speicherung

Blocks werden strukturiert gespeichert:

```json
{
  "id": "block_id",
  "type": "markdown",
  "props": {
    "content": "# Title"
  },
  "metadata": {},
  "version": 1
}
```

---

# 9. Versionierung

- jede Änderung erzeugt neue Version
- vollständige Historie
- rollback möglich

---

# 10. Permissions

- erben von Page
- optional block-spezifische Overrides

---

# 11. Plugin System

Block-Typen sind erweiterbar durch Plugins:

- render logic
- schema
- editor UI
- server hooks (optional)

---

# 12. Beziehung zu Pages

Page = Container  
Block = Content Unit

---

# 13. Nicht Bestandteil

- Pages Domain
- Research Workspace Logic
- Browser Implementation
- Storage Layer
- Templates