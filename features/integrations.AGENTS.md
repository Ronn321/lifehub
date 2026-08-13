# integrations.AGENTS.md

# LifeHub — `integrations` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Infrastruktur-Domain für externe Drittanbieter-Verbindungen (zunächst **Google-Konto**). Verwaltet OAuth2-Verbindungen pro User, verschlüsselt Tokens und stellt authentifizierte API-Clients als **Public-Interface** für andere Domains bereit (calendar, email). Kein eigenes UI außer der GoogleAccountCard in den Einstellungen.

## 2. Scope

- Schema `integrations`, Tabelle `google_connections` (öffentliches Schema separat via Drizzle `pgSchema('integrations')`).
- Google-OAuth2 (Client aus Google Cloud Console): auth-url / callback / status / disconnect.
- Token-Verschlüsselung AES-256-GCM (`lib/token-crypto.ts`).
- `GoogleConnectionService` als **PUBLIC** Service für andere Domains (DOX `domains/AGENTS.md` §3.4).

## 3. Dependencies

- Spec: `integrations.feature.md`
- DB: `DATABASE_SCHEMA.md` (Schema `integrations`)
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users` (DONE)
- Abhängig von keiner anderen Domain (liegt unter den Google-Konsumenten)

## 4. Work Guidance

- **Public-Interface-Vertrag `GoogleConnectionService`** (aus `@lifehub/integrations-domain`), als public für andere Domains markiert:
  - `getStatus(ownerId)` → `GoogleConnectionStatus` (connected, email, grantedScopes, lastSyncAt)
  - `buildAuthUrl(ownerId)` → OAuth2-URL (offline access, prompt=consent, state-basiert)
  - `handleCallback(code, state)` → validiert State, tauscht Code gegen Tokens, persistiert verschlüsselt, liefert Redirect-URL
  - `disconnect(ownerId)` → soft-delete der Verbindung
  - `getGoogleClient(ownerId)` → `OAuth2Client` mit gültigem Access-Token (Auto-Refresh + verschlüsselte Persistenz)
  - `getGmail(ownerId)` → fertiger `gmail_v1.Gmail`-Client (googleapis)
  - Andere Domains rufen **nur** diese Methoden auf — nie `google_connections`-Tabellen oder Tokens direkt.
- **Scopes:** `openid`, `email`, `profile`, `gmail.modify`, `gmail.send`, `calendar`. Enthält Scopes für Gmail + Kalender (Konsumenten sind die beiden Domains).
- **Env-Variablen (`.env`):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `FRONTEND_URL`. Kein Secret im Code (Dev-Fallback `dev-key-do-not-use-prod` nur lokal).
- **Redirect-URI-Hinweis:** `GOOGLE_REDIRECT_URI` MUSS exakt als **autorisierte Redirect-URI** in der Google Cloud Console registriert sein (inkl. `/api/v1/integrations/google/callback`), sonst schlägt der OAuth-Flow mit redirect_uri_mismatch fehl.
- **Verschlüsselung:** Tokens via AES-256-GCM (`encryptToken`/`decryptToken`, `lib/token-crypto.ts`); niemals im Klartext loggen oder exponieren.
- **Callback ohne Guards:** `GET /integrations/google/callback` ist die einzige Route **ohne** `JwtGuard`/`PermissionGuard` (Google liefert keinen JWT). Alle anderen Endpoints mit Guards + `@RequirePermission('integrations', …)`.
- **Permissions:** Domain `integrations`: `read` (status), `update` (auth-url, disconnect). Übrige Aktionen reserviert.
- **Repository:** `google_connections` hat Soft-Delete (`deleted_at`); `disconnect` = soft-delete, `findByOwner` filtert `deleted_at IS NULL`.

## 5. Verification

- [ ] OAuth-Flow: auth-url → Google-Consent → callback → Status `connected:true` mit korrekter E-Mail + Scopes.
- [ ] State-Mismatch oder fehlender `refresh_token` → sauberer 400 mit klarer Meldung.
- [ ] Tokens in DB verschlüsselt (Raw-Query zeigt kein Klartext-Token).
- [ ] `getGoogleClient`-Auto-Refresh erneuert + persistiert Access-Token verschlüsselt.
- [ ] `getGmail(ownerId)` liefert Client, mit dem `users.getProfile` gelingt.
- [ ] Trennen → Status `connected:false`; calendar/email-Sync geben 401 ohne Verbindung.
- [ ] Permission: `read`/`update` korrekt; Callback ohne Guards erreichbar.
- [ ] `DOMAIN_STATUS.md` Status korrekt (DONE).
