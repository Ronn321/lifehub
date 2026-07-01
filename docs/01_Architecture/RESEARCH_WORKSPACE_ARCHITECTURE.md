# RESEARCH_WORKSPACE_ARCHITECTURE.md

# LifeHub – Research Workspace Architecture

Version: 1.0  
Status: Core Platform Component (Pages Integration)

---

# 1. Ziel

Der Research Workspace ist ein spezialisiertes System innerhalb der Pages-Domain.

Er dient zur strukturierten Durchführung, Speicherung und Wiederaufnahme von Recherchen.

Er erweitert klassische Webnutzung zu einem Wissens- und Arbeitskontext.

---

# 2. Grundprinzip

Eine Recherche besteht aus mehreren Elementen:

- Webseiten
- Suchanfragen
- Medien
- Dateien
- Notizen
- Entscheidungen
- Downloads
- Referenzen

Diese werden als Research Session gespeichert.

---

# 3. Integration in Pages

Der Research Workspace existiert nur innerhalb von Pages.

Page → Blocks → ResearchWorkspaceBlock

---

# 4. Research Session

Enthält:

- offene Tabs
- Tab-Reihenfolge
- aktive Quelle
- Suchhistorie
- angepinnte Seiten
- Notizen
- Downloads
- Tags
- Verknüpfungen zu Pages

---

# 5. Research Block

```json
{
  "type": "research_workspace",
  "props": {
    "sessionId": "uuid",
    "mode": "active",
    "sources": [],
    "collections": []
  }
}
```

---

# 6. Quellenmodell

**Web:**
- URLs
- Artikel

**Media:**
- Videos
- Bilder

**Documents:**
- PDFs
- Manuals

**Repositories:**
- GitHub
- GitLab

**Local:**
- NAS Dateien
- Jellyfin Inhalte

---

# 7. Research Collections

Gruppierte Wissenseinheiten:

**Projekt CNC:**
- GitHub Repo
- Printables
- Videos
- CAD Dateien
- Notizen

---

# 8. Browser Integration

Der Browser ist nur eine UI-Komponente.

Er ist nicht Teil der Architektur.

Er ist austauschbar.

---

# 9. Search Profiles

Kontextabhängige Suchquellen:

**3D Druck:**
- Printables
- MakerWorld

**Programming:**
- GitHub
- StackOverflow

**Electronics:**
- DigiKey
- Mouser

---

# 10. Downloads

Downloads müssen zugeordnet werden:

- Page
- Project
- Collection
- Media
- Documents

---

# 11. Notizen

- persistent
- page-gebunden
- unabhängig von Quelle

---

# 12. Wissensstruktur (Future Ready)

Vorbereitet für:

- Knowledge Graph
- AI Summaries
- Auto Tagging
- Source Linking

Nicht Teil von Phase 1.

---

# 13. Persistence Model

Page → ResearchWorkspaceBlock → Sessions → Sources → Notes → Collections

---

# 14. Non-Goals

Nicht:

- Webbrowser
- Suchmaschine
- Medienserver
- Datei-Manager

Nur: strukturierte Rechercheumgebung

---

# 15. Agent Rules

- nur innerhalb Pages erlaubt
- keine Standalone UI
- Sessions persistent speichern
- jede Quelle referenzierbar
- vollständige Integration ins Block-System
