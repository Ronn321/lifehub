# FEATURE_SPEC.md

# LifeHub Feature System (Master Spec)

## 1. Purpose

LifeHub ist ein modularer, self-hosted Family Operating System Stack.

Dieses Dokument definiert:
- globale Feature-Regeln
- Domain-Struktur
- Interaktionen zwischen Domains
- Standards für APIs, UI und Daten
- Definition of Done

---

## 2. System Design Principles

- Domain Driven Design (DDD)
- Modular Monolith (Phase 1–3)
- Plugin-ready Architecture (Phase 4)
- API First Design
- NAS-first storage
- Tailscale-first access
- Security by default

---

## 3. Domain Model

Jede Domain ist vollständig isoliert und besitzt:

- eigene Entities
- eigene API
- eigene UI Module
- eigene Regeln
- eigene Berechtigungen

Domains dürfen nur über IDs referenzieren.

---

## 4. Core Domains

- users
- media
- travel
- projects
- recipes
- shopping
- finance
- insurance
- vault
- documents
- calendar
- it_inventory
- jellyfin
- search
- dashboard
- plugins

---

## 5. Cross-Domain Rules

### Allowed:
- media_id Referenzen
- user_id Referenzen
- file_id Referenzen
- tag_id Referenzen

### Forbidden:
- direkte Datenbankzugriffe zwischen Domains
- shared business logic außerhalb shared layer
- cross-domain table ownership

---

## 6. Shared Layer

- auth
- permissions (RBAC)
- storage (NAS abstraction)
- search engine
- audit logging
- tagging system
- notifications

---

## 7. API Standards

- REST first
- OpenAPI mandatory
- versioned endpoints (/v1)
- JWT auth required
- role-based access enforcement

---

## 8. UI Standards

- Next.js App Router
- Sidebar navigation
- Dashboard widget system
- Mobile-first responsive design
- Dark mode default

---

## 9. Security Standards

- Argon2 password hashing
- AES-256 vault encryption
- HTTPS only
- Tailscale private access option
- audit logging for all mutations

---

## 10. Storage Rules

- NAS is source of truth for media/files
- DB stores metadata only
- thumbnails stored separately
- no raw media in DB

---

## 11. Definition of Done

A feature is complete when:

- API implemented
- UI implemented
- Permissions implemented
- Tests exist
- Audit logging enabled
- Documentation updated
