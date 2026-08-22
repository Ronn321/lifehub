# Command Results

| Command | Status | Exit | Dauer | Evidenz |
|---|---:|---:|---:|---|
| `frontend-typecheck` | **PASS** | 0 | 15.0 s | frontend-typecheck.log |
| `frontend-lint` | **PASS** | 0 | 11.5 s | frontend-lint.log |
| `frontend-test` | **PASS** | 0 | 3.04 s | frontend-test.log |
| `frontend-build` | **PASS** | 0 | 32.85 s | frontend-build.log |
| `backend-build` | **PASS** | 0 | 14.86 s | backend-build.log |
| `backend-lint` | **PASS** | 0 | 5.31 s | backend-lint.log |
| `backend-test` | **PASS** | 0 | 0.73 s | backend-test.log |
| `backend-coverage` | **FAIL** | 1 | 1.54 s | backend-coverage.log |
| `pages-typecheck` | **PASS** | 0 | 2.75 s | pages-typecheck.log |
| `renderer-auth-vitest` | **PASS** | 0 | 0.98 s | renderer-auth-vitest.log |
| `dependency-audit-prod` | **FAIL** | 1 | 10.77 s | dependency-audit-prod.log |
| `workspace-typecheck` | **PASS** | 0 | — s | workspace-typecheck.log |
| `workspace-test` | **FAIL** | 1 | — s | workspace-test.log |
| `renderer-node-check` | **PASS** | 0 | — s | node --check server.js passed |
| `compose-dev-config` | **PASS** | 0 | — s | docker compose config -q passed with review placeholders |
| `compose-prod-config` | **PASS** | 0 | — s | docker compose -f docker-compose.prod.yml config -q passed with review placeholders |
| `docker-runtime` | **BLOCKED** | — | — s | Docker Desktop daemon not running on review VM |

## Wesentliche Resultate

- Frontend: Typecheck, Lint (mit 76 Warnungen), 87 Tests und Build erfolgreich.
- Backend: Build/Lint erfolgreich; App-Test meldet wegen `--passWithNoTests` grün, obwohl keine Testdateien gefunden wurden.
- Backend Coverage: fehlgeschlagen, effektiv 0 %.
- Workspace-Typecheck: 28/29 Projekte erfolgreich.
- Workspace-Test: fehlgeschlagen; Contacts-/Dashboard-API-Suites können `@lifehub/auth` nicht auflösen.
- Renderer-Auth: 2 Vitest-Tests erfolgreich; Syntaxcheck erfolgreich.
- Dependency Audit: 49 Schwachstellen — 3 niedrig, 24 mittel, 22 hoch.
- Compose Dev/Prod: statische Konfiguration gültig. Docker-Build/Runtime auf Review-VM blockiert, weil Docker Desktop nicht läuft.

Vollständige Logs: `command-logs/`.