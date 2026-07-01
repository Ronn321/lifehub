# finance.AGENTS.md

# LifeHub — `finance` Domain DOX Contract

Version: 1.0
Parent: `../AGENTS.md` → `../../AGENTS.md`

---

## 1. Purpose

Persönliche/Familien-Finanzverwaltung. Konten, Buchungen, Budgets, Sparziele, Spartöpfe, Portfolio (Aktien/ETF/Anleihen/Krypto/Edelmetalle). Charts (Net Worth, Cashflow, Sparquote, Asset-Allocation-Donut). **Phase 3, sensible Daten.**

## 2. Scope

- Schema `finance`: `accounts`, `categories`, `transactions`, `budgets`, `savings_goals`, `assets`, `asset_prices`
- Account-Typen: `checking | savings | brokerage | credit | cash | crypto | jar`
- CSV-Import von Bank-Exporten (MT940, CAMT.053, CSV-Generic), `import_hash` für Re-Import-Schutz
- Sparziele mit `target_amount`, `current_amount`, optional `jar_account_id` (Spartopf)
- Portfolio: manuelle Kurs-Updates, Asset-Allokation-Donut
- Charts via Recharts (Phase 2, in MVP nur Kennzahlen-Karten)

## 3. Dependencies

- Spec: `finance.feature.md`
- DB: `DATABASE_SCHEMA.md` §10
- Architektur: `ARCHITECTURE.md` §4.9
- Status: `docs/DOMAIN_STATUS.md` (Sensitive Modules)
- Vorgänger: `users` (DONE)
- Kind-Verhalten: `child`-Rolle hat **keinen** Zugriff auf `finance.*` (siehe `docs/GLOBAL_RULES.md`)

## 4. Work Guidance

- **Beträge werden als `NUMERIC(18,2)`** gespeichert, niemals `FLOAT`. Währung ISO-4217 (`CHAR(3)`).
- **Sicherheit:** Verschlüsselung-at-rest optional in V2 (`TECH_STACK.md` §12). Audit-Trigger ist Pflicht.
- CSV-Import: pro Bank-Format eigener Parser in `domains/finance/import/`, niemals generischer „alles einlesen".
- Spartöpfe (`jar`-Account-Typ) sind reguläre Accounts mit Tag/Filter, keine eigene Tabelle.
- Performance: Dashboard mit 12 Monaten Buchungen < 1.5s.

## 5. Verification

- [ ] Migration idempotent.
- [ ] 5 Konten-Typen, 3 Sparziele, 1 Portfolio (10 Assets), 12 Monate Buchungen.
- [ ] CSV-Import: 3 Bank-Formate (Sparkasse, DKB, ING), Re-Import-Schutz via `import_hash`.
- [ ] Sparziel-Fortschritt aktualisiert sich bei Transaktionen auf `jar`-Account.
- [ ] Donut-Chart summiert Asset-Allocation korrekt.
- [ ] `child`-Rolle: `finance.*` Endpoints liefern 403.
- [ ] Audit + Events (`TransactionCreated`, `BudgetExceeded`).
- [ ] Performance-Test: 10k Buchungen aggregiert in < 500ms.
- [ ] `DOMAIN_STATUS.md` auf `DONE`.
