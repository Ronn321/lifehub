# projects.AGENTS.md

# LifeHub — `projects` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Verwaltung von Hobby-/Technik-Projekten: 3D-Druck, Arduino, Raspberry Pi, Code, Elektronik, DIY. Projektseiten mit Datei-Ablage (STL, GCODE, Code, Bilder, PDFs), Markdown-Notizen, GitHub-Links, YouTube-Embeds. **Phase 2.**

## 2. Scope

- Schema `projects`: `projects`, `project_files`, `project_notes`, `project_links`
- Projekt-Typen: `3d_print | arduino | raspi | code | electronics | diy`
- Status: `planning | building | done | archived`
- Datei-Upload mit `kind`-Erkennung (STL/GCODE/Code/Image/Doc/Other)
- GitHub-Repo-Verlinkung (nur URL, kein Mirror)
- YouTube-Embed über sichere URL-Sanitisierung

## 3. Dependencies

- Spec: `projects.feature.md`
- DB: `DATABASE_SCHEMA.md` §7
- Architektur: `ARCHITECTURE.md` §4.5
- Stack: `TECH_STACK.md` §3.4 (File-Upload via StorageService)
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users`, `media`

## 4. Work Guidance

- Datei-Ablage über `StorageService` (nicht direkt).
- YouTube-URL-Sanitisierung serverseitig: nur `youtube.com/embed/…` oder `youtube-nocookie.com/embed/…` zulassen, alles andere als normaler Link behandeln.
- GitHub-URL nur als String speichern, kein automatisches API-Polling (Performance).
- Markdown-Editor im Frontend: CodeMirror oder TipTap (siehe `UI_UX.md` §3 für Editor-Komponente).
- Kein Cross-Domain-JOIN auf `media` — Cover-Image per `media_id`-Referenz (analog `travel`).

## 5. Verification

- [ ] Migration idempotent.
- [ ] Projekt-Erstellung mit allen 6 Typen getestet.
- [ ] STL/GCODE-Upload mit korrekter `mime_type`-Erkennung.
- [ ] YouTube-Embed-Sanitisierung: malicious URLs (`javascript:`, custom schemes) abgewiesen.
- [ ] Markdown-Notiz mit XSS-Versuch (`<script>`) gefahrlos gerendert.
- [ ] Permission + Audit + Events.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
