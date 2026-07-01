# it_inventory.AGENTS.md

# LifeHub — `it_inventory` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Inventar aller IT- und Smart-Home-Geräte im Haushalt. Netzwerk-Ansicht, Garantie-Tracker, Credential-Links zu `vault`. Optionaler nmap-Netzwerk-Scan. **Phase 4.**

## 2. Scope

- Schema `it_inventory`: `locations`, `devices`, `network_interfaces`, `device_credentials`
- Geräte-Typen: `pc | nas | router | switch | ap | printer | server | iot | phone | other`
- Felder: Name, Standort, IP, MAC, Seriennummer, Hersteller, Modell, Garantie, OS
- `device_credentials`: `vault_entry_id`-Referenz (verknüpft IT-Gerät mit Vault-Passwort)
- Optionaler nmap-Worker: erkennt neue Geräte im LAN
- Standort-Hierarchie (Baum via `parent_id`)

## 3. Dependencies

- Spec: `it_inventory.feature.md`
- DB: `DATABASE_SCHEMA.md` §15
- Architektur: `ARCHITECTURE.md` §4.13
- Status: `docs/DOMAIN_STATUS.md`
- Vorgänger: `users`, `vault` (für Credential-Verknüpfung)

## 4. Work Guidance

- nmap-Scan als **optionales Profil** in `docker-compose.yml` (siehe `docs/DOCKER_COMPOSE_PRODUCTION.md` §5), NIEMALS standardmäßig aktiv.
- `device_credentials`: Link zu Vault, nicht zum Klartext. Permission-Check: wer `it_inventory.read` hat, sieht **nur** den Vault-Link, nicht den Inhalt.
- Garantie-Tracker: `warranty_until` < `now()` → Liste „abgelaufen" / „läuft bald ab".
- `mac_address` als PG-Typ `MACADDR` (siehe `DATABASE_SCHEMA.md` §15), nicht String.

## 5. Verification

- [ ] Migration idempotent.
- [ ] 47 Geräte aus realem Haushalt erfasst, 3 Standorte (Büro/Wohnzimmer/Keller).
- [ ] nmap-Scan (falls Profil aktiv) findet 3 unbekannte Geräte, manuell hinzugefügt.
- [ ] Garantie-Tracker: 2 Geräte abgelaufen, 3 laufen in 30 Tagen ab.
- [ ] Vault-Link funktioniert: Klick auf „Admin-Passwort" öffnet Vault-Eintrag.
- [ ] `child`-Rolle: `it_inventory.read` ist erlaubt, `update` nicht.
- [ ] Audit + Events.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
