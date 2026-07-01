# users.AGENTS.md

# LifeHub — `users` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md` (MUSS in dieser Reihenfolge gelesen werden)

---

## 1. Purpose

Zentrales Identitäts- und Berechtigungs-System. Eigene Entities (User, Group, Role, Permission), eigene API, eigene UI, eigene Regeln. **MUSS als erste Domain vollständig implementiert werden** (Phase 0, siehe `docs/AGENT_EXECUTION_SYSTEM.md` §3.2).

## 2. Scope (was diese Domain besitzt)

- `public.users`, `public.groups`, `public.roles`, `public.permissions`, `public.user_roles`, `public.role_permissions`, `public.sessions`, `public.audit_logs`, `public.tags`, `public.domain_events`
- JWT-Auth (Access + Refresh), Argon2id-Passwort-Hashing
- RBAC-Engine + NestJS-Guards (`JwtGuard`, `PermissionGuard`, `RolesGuard`)
- 4 Standardrollen (admin, family, child, guest) + 96 Permissions (16 Domains × 6 Actions)
- User-UI: Login, Profil, User-Liste, Role-Editor, Permission-Matrix

## 3. Dependencies (Pflicht-Quellen vor jeder Änderung)

- Spec: `users.feature.md`
- DB: `DATABASE_SCHEMA.md` §4 (komplettes `public`-Schema)
- Architektur: `ARCHITECTURE.md` §4.1, §8 (Auth + RBAC)
- Stack: `TECH_STACK.md` §3.3 (Argon2, JWT, TOTP, Rate-Limit)
- Status: `docs/DOMAIN_STATUS.md` (Root-Foundation-Block)
- Regeln: `docs/GLOBAL_RULES.md` (Permission Model, Data Ownership, Events)

## 4. Work Guidance

- **Erste Domain, kein Überspringen.** Alle anderen Domains hängen von `users` ab (Foreign Keys auf `public.users.id`).
- Schema → Service → API → UI → Tests, vertikal, keine horizontale Parallelisierung.
- Permission-Matrix pro Endpunkt dokumentieren, Tests grün für alle 4 Rollen.
- Audit-Trigger auf `public.users` aktivieren (siehe `DATABASE_SCHEMA.md` §19).
- Argon2id-Parameter gemäß `TECH_STACK.md` §3.3 (memory=64MB, iterations=3).
- JWT-Schlüssel (RS256) werden aus `.env` (Base64) geladen, nicht aus DB.

## 5. Verification

- [ ] Drizzle-Migration läuft idempotent (`pnpm db:migrate`).
- [ ] 96 Standard-Permissions geseedet (Count-Check in Test).
- [ ] 4 Standardrollen mit ihren Default-Mappings geseedet.
- [ ] Unit-Tests: Service-Layer (Vitest) ≥ 70 % Coverage.
- [ ] API-Tests: Supertest grün für alle Endpoints mit 4 Test-Usern.
- [ ] Permission-Tests: `4 Rollen × alle Endpoints` Matrix grün (siehe `docs/CODE_GENERATION_TEMPLATES.md` §11).
- [ ] Audit-Log zeigt INSERT/UPDATE/DELETE auf `public.users` (manuell verifiziert).
- [ ] Argon2-Parameter per `pnpm test:security` gegen OWASP-Mindestwerte geprüft.
- [ ] Login-Flow End-to-End im Frontend (manuell + Playwright-Smoke).
- [ ] `docs/DOMAIN_STATUS.md`: Status auf `DONE` gesetzt.

## 6. Status

Siehe `docs/DOMAIN_STATUS.md` (Tabelle „Core Foundation"). Wird vom Agent bei jeder Transition aktualisiert.

## 7. Child DOX Index

Keine Sub-Domains. Wenn künftig z.B. `users/oauth/` als Sub-Domain entsteht (Google-Login, WebAuthn-Passkeys), bekommt **er** eine eigene `AGENTS.md` und wird hier eingetragen.
