# INTEGRATIONS FEATURE

## Goal

Infrastruktur-Domain für externe Drittanbieter-Verbindungen (zunächst **Google-Konto**). Verwaltet OAuth2-Verbindungen pro User und stellt gesicherte API-Clients (Gmail, Calendar) als **Public-Interface** für andere Domains bereit. Eigentümer einer Verbindung ist der LifeHub-User.

---

## Features

- **Google-OAuth2-Flow:** `GET /integrations/google/auth-url` (State-basiert), `GET /integrations/google/callback` (ohne Guards, wird von Google aufgerufen), `DELETE /integrations/google/connection` (Trennen)
- **Verbindungsstatus:** `GET /integrations/google/status` (connected, email, grantedScopes, lastSyncAt)
- **Token-Verschlüsselung:** Access-/Refresh-Token **AES-256-GCM** verschlüsselt in `integrations.google_connections` (`lib/token-crypto.ts`, Key via `GOOGLE_TOKEN_ENCRYPTION_KEY`)
- **Auto-Refresh:** `getGoogleClient` persistiert erneuerte Access-Tokens verschlüsselt zurück
- **Public-Interface für andere Domains:** `GoogleConnectionService` (getStatus / buildAuthUrl / handleCallback / disconnect / getGoogleClient / getGmail)
- Scopes: `openid`, `email`, `profile`, `gmail.modify`, `gmail.send`, `calendar`

---

## Entities

- **GoogleConnection** (id, ownerId, googleEmail, displayName, avatarUrl, tokenExpiresAt, grantedScopes, lastSyncAt)
- **GoogleConnectionStatus** (connected, email, grantedScopes, lastSyncAt)

---

## Screens

- Settings-Tab **„Google-Konto"** (`GoogleAccountCard`): Verbinden / Status / Trennen
- Redirect nach OAuth: `FRONTEND_URL/settings?google=connected`

---

## API

```
GET    /integrations/google/auth-url      # { url }
GET    /integrations/google/callback?code=...&state=...   # 302 Redirect (ohne Guards)
GET    /integrations/google/status
DELETE /integrations/google/connection    # 204
```

---

## Rules

- **State-Bindung:** `state` trägt `{ u: ownerId, r: nonce }` (base64url-JSON); Callback validiert ihn, um CSRF zu verhindern.
- **Kein Refresh-Token → Fehler:** Wird kein `refresh_token` geliefert (weil Scope schon konsentiert), user muss Verbindung in Google-Kontoeinstellungen entfernen und neu verbinden.
- **Verschlüsselung:** Tokens werden ausschließlich verschlüsselt gespeichert und niemals über die API exponiert; `getStatus` liefert nur abgeleitete Daten (email, scopes, lastSyncAt).
- **Permissions:** Domain `integrations`: `read` (status), `update` (auth-url, disconnect). Weitere Aktionen reserviert.
- **Callback ohne Guards:** nur die `/callback`-Route ist ohne `JwtGuard`/`PermissionGuard` (Google kann keinen JWT liefern); alle anderen Endpoints sind geschützt.

---

## Integrations

- **Consumers:** `calendar` (Calendar-Sync), `email` (Gmail-Proxy) — beide importieren `GoogleConnectionService`
- **users** — Eigentümer (`ownerId`, FK auf `public.users`)
