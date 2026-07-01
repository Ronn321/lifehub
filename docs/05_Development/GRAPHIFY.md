# GRAPHIFY.md

# LifeHub — Knowledge-Graph-Workflow mit graphify

Version: 1.0
Tool: [graphify](https://github.com/safishamsi/graphify)

---

## 1. Zweck

LifeHub hat aktuell **40+ Markdown-Dateien** verteilt auf `docs/00_Project/`, `docs/01_Architecture/`, `docs/02_Features/`, `docs/03_Design/`, `docs/04_Database/`, `docs/05_Development/`, `docs/06_Deployment/`, `features/`, plus 19 AGENTS.md-Dateien. DOX (siehe Root-`AGENTS.md`) regelt **welche** Datei wann gelesen wird — aber nicht **wie effizient** ein Agent den Inhalt durchsucht.

`graphify` ist die **Lese-Schicht** dazu: es baut aus dem Korpus einen Knowledge-Graphen, mit dem Agenten Inhalte **71× schneller** abfragen können, statt alle Dateien zu lesen. Primär ein Werkzeug für den Entwickler-/Agent-Loop, **nicht** ein App-Baustein.

---

## 2. Wann graphify einsetzen

| Situation | graphify-Aufruf |
|-----------|-----------------|
| Vor großer Refactoring-Aufgabe (Spec-Migration, Phase-Update) | `/graphify .` einmalig full-build |
| Tägliche Entwicklung | `graphify hook install` (post-commit Hook) |
| Multi-Agent-Setup, parallele Bearbeitung | `graphify . --watch` im Hintergrund-Terminal |
| Neue Quelle (Paper, Tweet, Screenshot) zum Korpus | `graphify add <url>` |
| Konkrete Frage quer durch alle Specs | `graphify query "…"` |
| Pfad-Suche zwischen zwei Konzepten | `graphify path "Vault" "Tailscale"` |
| Erklärung eines Konzepts im Kontext | `graphify explain "DomainEvents"` |

---

## 3. Was graphify NICHT ersetzt

- **DOX-Workflow** (AGENTS.md-Kette) — regelt *welche* Datei wann relevant ist
- **`search`-Domain** (Meilisearch, Phase 4) — indiziert **Nutzer-Daten** zur Laufzeit
- **`DOMAIN_STATUS.md`** — explizite Live-Status-Tabellen, die graphify nur sekundär abbildet
- **`docs/XX_*/`-Master-Specs** — graphify ist derived state, die Specs sind Source of Truth

graphify ergänzt, ersetzt nichts.

---

## 4. Output-Lokation

`graphify` schreibt nach `graphify-out/` (im Repo-Root, **nicht** committen — siehe `.gitignore` unten):

```
graphify-out/
├── graph.html         # interaktiver Graph (im Browser öffnen)
├── obsidian/          # Obsidian-Vault (kann separat committed werden)
├── wiki/              # Wikipedia-Artikel pro Community (--wiki)
├── GRAPH_REPORT.md    # god nodes, surprising connections, suggested questions
├── graph.json         # persistenter Graph
└── cache/             # SHA256-Cache, nur geänderte Files werden reprocessed
```

Diese Outputs sind **read-only** für den Agent: er liest `GRAPH_REPORT.md` und `wiki/`, schreibt aber nicht hinein.

---

## 5. Install (einmalig)

```bash
# 1. Python 3.10+ vorausgesetzt
pip install graphifyy && graphify install

# 2. Optional: Git-Hook für Auto-Rebuild nach jedem Commit
graphify hook install
```

**Hinweis PyPI-Name:** Während der Reclaim-Phase heißt das Paket `graphifyy` (zwei `y`), CLI bleibt `graphify`.

**Windows-spezifisch:** Falls `graphify` nicht erkannt wird, Python-Scripts-Pfad zur PATH-Variable hinzufügen oder `pipx install graphifyy` nutzen.

---

## 6. Empfohlener Workflow für LifeHub

### 6.1 Phase 0/1 (MVP) — manuelle Builds

```bash
# Vor jeder größeren Implementierung
/graphify .

# Output inspizieren
open graphify-out/graph.html          # visuell
cat graphify-out/GRAPH_REPORT.md      # god nodes, surprising connections

# Bei Bedarf Wiki-Form generieren (für Agent-Navigation)
/graphify . --wiki
```

### 6.2 Sobald Git-Repo existiert — Hook-Workflow

```bash
graphify hook install
# → post-commit Hook rebuildet den Graph nach jedem Commit
# Code-Änderungen: AST-only, instant (kein LLM)
# Markdown-Änderungen: benachrichtigt → manuell `graphify . --update` für LLM-Pass
```

### 6.3 Sobald Code existiert — Watch-Mode

```bash
# Im separaten Terminal, persistent
graphify . --watch
# → Code-Saves: instant rebuild
# → Markdown/Doc-Saves: notify → manuell `graphify . --update` für LLM-Run
```

### 6.4 Multi-Agent-Setup (Phase 2+)

Wenn mehrere Agenten parallel an verschiedenen Domains arbeiten:

1. Agent A bearbeitet `features/finance.feature.md`
2. Agent B parallel `features/recipes.feature.md`
3. Beide committen → Post-Commit-Hook triggert Graph-Rebuild
4. Jeder Agent liest `GRAPH_REPORT.md` für aktuellen Stand

---

## 7. Konkrete Use-Cases für LifeHub

### 7.1 Vor Implementierung der `users`-Domain

```bash
/graphify .
# Frage: "Was muss `users` beachten?"
graphify query "users domain dependencies"
# Output: Verknüpfung zu auth, permissions, storage, audit + Cross-Refs zu allen Master-Specs
```

### 7.2 Refactoring: Vault-Schema erweitern

```bash
graphify explain "vault entries schema"
# → zeigt betroffene Dateien, Permissions, Tests, Cross-Refs zu users/permissions
graphify path "vault.ciphertext" "key_version"
# → findet Migrations-Pfad, Rotation-Job-Plan, Verification
```

### 7.3 Phase-Übergang (MVP → V1)

```bash
graphify query "what does V1 add that MVP does not have?"
graphify path "MVP" "V1"
# → Liste der neu zu implementierenden Domains mit allen Cross-Refs
```

### 7.4 Multi-Modal-Korpus erweitern (geplant)

Sobald Diagramme/Whiteboard-Fotos dazukommen (z.B. NAS-Netzwerk-Plan, Wohnungs-Grundriss für IT-Inventory):

```bash
graphify add ./assets/network-diagram.png
graphify add ./assets/floor-plan.jpg
graphify add https://arxiv.org/abs/2406.01234   # Paper
# → Graph wird multimodal ergänzt
```

---

## 8. `.gitignore` Ergänzung

In `apps/frontend/.gitignore` (oder Root-`.gitignore`, wenn zentralisiert):

```gitignore
# graphify outputs
graphify-out/
!graphify-out/GRAPH_REPORT.md   # optional committen als lebendige Doku
```

Empfehlung: `GRAPH_REPORT.md` committen als **lebendige Referenz-Doku**, die sich automatisch aktualisiert. Rest ignorieren.

---

## 9. Performance-Erwartung

Aus graphify's Benchmarks (Karpathy-Repos + 5 Papers + 4 Bilder = 52 Files): **71.5× Token-Reduktion** pro Query.

Für LifeHub-Korpus (40+ .md + später Code + Bilder) wird eine **30–80× Reduktion** erwartet, sobald der Korpus wächst. Bei aktuell 40+ Spec-Dateien ist der Effekt hauptsächlich **Strukturklarheit**, weniger Kompression — der Nutzen skaliert mit dem Korpus.

---

## 10. DOX-Integration

Diese Datei ist **kein AGENTS.md** und kein Ersatz dafür. Sie ist eine **Tool-Anleitung** im `docs/`-Ordner, weil:

- sie **für den Menschen** geschrieben ist (Install, Workflow, Beispiele)
- sie nicht regelt, was bei welcher Datei-Änderung passiert (das macht DOX)
- sie als **Quick-Reference** dient, nicht als Vertrag

DOX-Lesepflicht für `docs/05_Development/GRAPHIFY.md` selbst: keine.

---

## 11. Versionsnotiz

graphify ist aktiv maintained (Stand 06/2026: 748+ Commits, 66.7k Stars, 6.7k Forks, letzter Commit 5h vor Snapshot). Latest Tag-Set: 136 Tags, `v8` ist Default-Branch.

Vor LifeHub-Phase-MVP keine Hard-Dependency auf graphify — es ist ein **Produktivitäts-Multiplikator**, nicht ein kritischer Pfad.
