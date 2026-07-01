# plugins.AGENTS.md

# LifeHub — `plugins` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Erweiterbarkeits-System. Plugins installieren, Permissions vergeben, UI-Slots (Sidebar-Einträge, Widgets, Routen) registrieren, Event-Hooks konsumieren. Sandboxed Runtime (Node-Worker oder WASM). **Phase 6.**

## 2. Scope

- Schema `plugins`: `plugins`, `plugin_permissions`, `plugin_data`
- Plugin-Manifest als YAML/JSON (Name, Version, Author, Permissions, Hooks, UI-Slots)
- Runtime: Node-Worker-Thread mit `vm`-Context oder WASM-Module
- Permission-Modell: pro Plugin eigene `plugin_permissions`-Tabelle, granted pro User
- UI-Slot-API: Sidebar-Eintrag registrieren, Widget registrieren, Route registrieren
- Event-Hook-System: Plugins abonnieren Domain-Events
- Beispiel-Plugins: Home-Assistant-Bridge, KI-Assistent, Fahrzeug-Management, Fitness-Tracker

## 3. Dependencies

- Spec: `plugins.feature.md`
- DB: `DATABASE_SCHEMA.md` §18
- Architektur: `ARCHITECTURE.md` §4 (Erweiterungssystem), §5 (AES — Plugins kommen zuletzt)
- Stack: `TECH_STACK.md` §3.3 (Security-Bibliotheken)
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: **alle** anderen Domains (Plugins hängen vom stabilen Domain-Set ab)

## 4. Work Guidance

- Plugins dürfen NUR über dokumentierte Public-API des Backends sprechen, niemals direkt auf DB.
- Permission-System ist **strikt**: Plugin muss jede benötigte Permission deklarieren, User muss explizit granten.
- Sandboxing: keine `eval`, kein `Function()`, kein direkter `require()` — nur signierte Manifeste + Whitelist.
- Plugin-Data (`plugin_data`-Tabelle) ist der einzige erlaubte Persistenz-Weg für Plugins (kein Write in andere Domain-Schemas).
- Plugin-Versionierung: Semver enforced, Breaking-Changes benötigen Major-Bump + User-Re-Grant.
- Plugin-Marketplace: nur lokal (kein öffentlicher Store in MVP), Plugins werden aus Git-Repo installiert.

## 5. Verification

- [ ] Migration idempotent.
- [ ] Plugin-Manifest-Validation (zod-Schema) lehnt fehlerhafte Manifests ab.
- [ ] Beispiel-Plugin (z.B. „Hallo-Welt"-Widget) installiert, erscheint in Sidebar.
- [ ] Permission-Enforcement: Plugin ohne `media.read` bekommt 403 auf Media-API.
- [ ] Sandboxing: Plugin mit malicious Code (`process.exit()`) wird abgebrochen.
- [ ] Plugin-Data isoliert: Plugin A kann Plugin B's Data nicht lesen.
- [ ] Uninstallation: Plugin + alle `plugin_data` + `plugin_permissions` weg, Sidebar/Widget weg.
- [ ] Audit + Events.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
