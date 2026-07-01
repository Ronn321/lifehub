# vault.AGENTS.md

# LifeHub — `vault` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Passwort- und Secret-Manager. AES-256-GCM-verschlüsselt, Zero-Knowledge-Design (Server sieht nie Klartext), Argon2-KDF aus User-Master-Passwort, TOTP, Karten, sichere Notizen, Anhänge. **Phase 3, sicherheitskritisch.**

## 2. Scope

- Schema `vault`: `vault_entries`, `totp_secrets`, `cards`, `attachments`
- Entry-Typen: `login | note | card | identity | ssh`
- TOTP (RFC 6238, SHA1/256/512, 6/8 Digits, 30s Standard)
- Card-Speicherung: nur `last4` + Marke im Klartext (Anzeige), Rest verschlüsselt
- Anhänge: bereits vor Upload AES-verschlüsselt (Streaming-Encryption)
- Master-Key-Ableitung: Argon2id (memory=64MB, iterations=3, parallelism=4) + serverseitiges Salt
- Key-Rotation: `key_version` Spalte, Re-Wrap-Worker für Rotation
- Import-Workflow: Bitwarden / 1Password / Chrome CSV → verschlüsselt persistieren

## 3. Dependencies

- Spec: `vault.feature.md`
- DB: `DATABASE_SCHEMA.md` §12
- Architektur: `ARCHITECTURE.md` §4.11, §12 (Security-Matrix)
- Stack: `TECH_STACK.md` §3.3 (Vault-Krypto: Node `crypto.createCipheriv('aes-256-gcm')`, `otplib`)
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users` (DONE), Audit-System aktiv

## 4. Work Guidance

- **NIEMALS Klartext serverseitig loggen, auch nicht in Debug-Logs.** Pino-Konfiguration: Vault-Modul mit `redact: ['*.password', '*.secret', '*.ciphertext']`.
- Master-Key wird **niemals** persistiert. Pro Login leitet die App den Schlüssel ab und hält ihn nur im Speicher der Session.
- `ciphertext` + `nonce` + `aad` (entry_id) sind alle Pflicht — AAD verhindert Copy-Attack zwischen Entries.
- `key_version`-Rotation als separater Migrations-Job, nicht im Request-Thread.
- Vor V2-Release: **externes Security-Audit** (5–15 k € Budget) — siehe `PLAN.md` §7.
- `child`-Rolle hat **keinen** Zugriff (`docs/GLOBAL_RULES.md`).

## 5. Verification

- [ ] Migration idempotent.
- [ ] AES-256-GCM: Known-Answer-Tests (KAT) gegen Test-Vektoren.
- [ ] Argon2-KDF: 64 MB, 3 Iter — Timing-Test ≥ 250 ms.
- [ ] TOTP: 3 Test-Secrets, Code stimmt mit Google-Authenticator überein.
- [ ] Round-Trip: 100 Einträge mit Zufallsdaten encrypt → decrypt → bit-genau identisch.
- [ ] AAD-Schutz: ciphertext von Entry A lässt sich nicht als Entry B entschlüsseln.
- [ ] Key-Rotation: v1 → v2 Re-Wrap ändert `key_version`, Daten bleiben entschlüsselbar.
- [ ] Audit-Log enthält **keine** Vault-Klartext-Felder (Redaction-Test).
- [ ] Import-Test: Bitwarden-Export (100 Einträge) → erfolgreich importiert.
- [ ] `child`-Rolle: 403 auf alle `vault.*` Endpoints.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
- [ ] **Vor V2-Release:** externes Pen-Test-Audit dokumentiert.
