# PAGE_ARCHITECTURE.md

# LifeHub – Page Architecture

Version: 1.0

Status: Core Platform Architecture

---

# 1. Ziel

Die Pages-Domain ist das zentrale Organisations- und UI-System von LifeHub.

Sie ersetzt klassische, isolierte Domänenoberflächen durch ein universelles Seitenmodell.

Alle Inhalte im System werden über Pages dargestellt und organisiert.

Pages sind der primäre Einstiegspunkt für Benutzerinteraktionen.

---

# 2. Grundprinzip

Eine Page ist ein universeller Container für strukturierte Inhalte.

```text
Page
  → Blocks[]
```

Pages enthalten keine feste UI-Logik.

Die gesamte Darstellung erfolgt über das Block-System.

---

# 3. Page Definition

Eine Page ist ein eigenständiges Objekt mit Metadaten, Struktur und Beziehungen.

## 3.1 Kernfelder

- id
- title
- description
- icon
- coverImage
- ownerId
- parentPageId
- permissions
- tags
- templateId
- createdAt
- updatedAt

## 3.2 Struktur

```json
{
  "id": "page_123",
  "title": "Projekt CNC",
  "blocks": [],
  "parentPageId": null,
  "permissions": {},
  "metadata": {}
}
```

---

# 4. Page Hierarchie

Pages sind hierarchisch organisiert.

```text
Root Page
  ├── Travel
  ├── Projects
  ├── Finance
  ├── Insurance
  └── Documents
```

Regeln:

- beliebige Tiefe erlaubt
- jede Page kann Subpages besitzen
- Navigation basiert auf Baumstruktur + Suche

---

# 5. Page Lifecycle

created → drafted → published → updated → archived → deleted

Regeln:

- Pages werden versioniert
- keine zerstörerischen Updates
- Archive bleiben zugänglich

---

# 6. Rendering Modell

Pages werden vollständig über Blocks gerendert.

Rendering Pipeline:

1. Page laden
2. Block-Liste laden
3. Block-Typen auflösen
4. Daten laden
5. Permissions prüfen
6. Blocks rendern
7. Interaktionen aktivieren

---

# 7. Navigation

Navigation erfolgt über:

## 7.1 Baumstruktur

Parent / Child Beziehungen

## 7.2 Suche

Volltextsuche über Titel, Tags, Inhalte

## 7.3 Favoriten

Benutzerdefinierte Shortcuts

## 7.4 Recent Pages

zuletzt verwendete Seiten

---

# 8. Permissions System

Pages besitzen ein rollenbasiertes Berechtigungssystem.

## 8.1 Rollen

- owner
- admin
- editor
- viewer
- restricted

## 8.2 Regeln

- Permissions vererben sich auf Subpages
- Blocks können Permissions überschreiben
- Zugriff wird serverseitig validiert

---

# 9. Templates System

Pages können aus Templates erstellt werden.

Templates definieren:

- initiale Blockstruktur
- Standardlayout
- vorgeschlagene Inhalte
- Domain-Kontext

Beispiele:

- Travel Template
- Project Template
- Finance Template
- Insurance Template
- Research Template

---

# 10. Block Integration

Pages bestehen ausschließlich aus Blocks.

Regeln:

- Pages enthalten keine UI-Logik
- Blocks sind vollständig verantwortlich für Darstellung
- Page definiert nur Struktur und Kontext

---

# 11. Metadata System

Pages enthalten erweiterbare Metadaten:

Beispiele:

- tags
- status (active, archived, draft)
- category
- external references
- linked entities
- attachments
- relations to other pages

---

# 12. Page Relations

Pages können miteinander verknüpft werden.

Typen:

- parent-child
- reference link
- related page
- dependency
- embedded page

---

# 13. Search Integration

Pages sind vollständig indexierbar.

Suchsystem umfasst:

- Titel
- Inhalte (Blocks)
- Tags
- Notizen
- Research Workspace Inhalte
- Metadata

---

# 14. Versioning

Pages werden versioniert.

Regeln:

- jede Änderung erzeugt neue Version
- Versionen sind wiederherstellbar
- Unterschiede werden gespeichert
- Audit Trail ist verpflichtend

---

# 15. Integration in Domains

Domains liefern keine eigenen UI-Seiten mehr.

Stattdessen liefern sie:

- Templates
- Blocktypen
- Datenquellen
- Business-Logik

Beispiel:

- Finance Domain → Finance Blocks + Templates
- Travel Domain → Travel Templates + Map Blocks
- Projects Domain → Project Templates + Integrations

---

# 16. Integration mit Research Workspace

Pages können Research Workspaces enthalten.

```text
Page
  → ResearchWorkspaceBlock
```

Diese ermöglichen:

- strukturierte Recherche
- externe Quellenverwaltung
- Notizen
- Collections
- Downloads

---

# 17. Storage Model

Pages werden gespeichert als:

- Page Table
- Block Table
- PageRelations Table
- PageVersions Table

Blocks sind separat versioniert.

---

# 18. Performance

Regeln:

- Lazy loading von Blocks
- Pagination für große Pages
- Caching von häufig genutzten Pages
- Partial rendering möglich

---

# 19. Offline Verhalten

- Pages können gecacht werden
- Read-only Zugriff möglich
- Blocks bleiben sichtbar
- Synchronisation erfolgt später

---

# 20. Security

- Server-seitige Permission Validation
- Block-level Access Control möglich
- Keine clientseitige Sicherheitslogik
- Audit Logging für jede Änderung

---

# 21. Non-Goals

Pages sind NICHT:

- Datenbank für Fachlogik
- Dateisystem
- Medienserver
- Workflow Engine
- CRM System

Pages sind ausschließlich:

- universelles Struktur- und UI-System

---

# 22. Agent Instructions

- Pages sind zentrale Entität des gesamten Systems
- keine Domain darf eigene UI-Seiten definieren
- alle UI-Komponenten laufen über Blocks
- jede neue Funktion muss Pages-kompatibel sein
- Templates sind bevorzugter Einstiegspunkt für neue Inhalte
- Block-System ist strikt einzuhalten
