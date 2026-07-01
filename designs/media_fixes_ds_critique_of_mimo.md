# Kritik: media_fixes_mimo_v1.md

Datum: 2026-06-19
Autor: Design-Scan (DS)
Basis: media_fixes_mimo_v1.md vs media_fixes_ds_v1.md
Status: Analyse

---

## Stärken

1. **Entscheidung gegen ID3-Tag-Parsing (§1.3)** — MIMO verzichtet bewusst auf eine neue Library für Audio-Metadaten und parsed stattdessen Track-Nummern aus dem Dateinamen (`{01 - }.mp3`). Das hält die Dependency-Basis schlank und ist für eine NAS-Bibliothek mit konsistenten Ordnerstrukturen ausreichend. DS hat diese Abwägung nicht explizit gemacht (DS §11.1 listet nur "Audio-Tag-Parsing" als Auschluss, ohne zu begründen).

2. **Komponenten-Tiefe bei Musik-UI** — `MusicLibrary` → `ArtistCard` → `AlbumView` → `TrackList` ist eine klare 4-stufige Hierarchie, die sich eins zu eins auf die UX-Navigation abbildet. Jede Komponente deckt genau eine Abstraktionsebene ab. Das erleichtert isoliertes Testen und spätere Erweiterungen (z.B. separater Artist-Detail-Screen).

3. **PlayerContext als Provider (§7.4)** — Der Mini-Player wird via `PlayerProvider` um die gesamte App gelegt, sodass Musik aus *jedem* Tab hörbar bleibt. DS hat denselben Ansatz (Zustand-Store), aber MIMO dokumentiert explizit, dass `{children}` *und* `AudioPlayer` gemeinsam gerendert werden — das ist die korrekte Architektur für einen persistenten Mini-Player und vermeidet die typische "Music-Tab-only"-Falle.

4. **Edge-Cases-Tabelle (§9)** — 10 Zeilen, tabellarisch, lösungsorientiert. Prägnanter als DS' 9 Abschnitte mit Fließtext. Besonders wertvoll: "Kein `relativePath` auf alter Datei → Fallback: `filename` als Pfad". DS erwähnt diesen Legacy-Fall nicht.

5. **Diashow-State-Maschine (§6.1)** — `IDLE → START → PLAYING → PAUSE → PLAYING` plus `NEXT`/`PREV`-Loop. Klarer als DS' Beschreibung ("Idle → Playing → Paused"), weil sie den `START`-Übergang explizit macht und die Loop-Destinationen (NEXT = Loop im gleichen State) präzisiert.

---

## Schwächen & Verbesserungspotential

### S1 — Monolithischer Music-Endpoint (§1.3)

`GET /media/music/library` liefert das gesamte Artist-Album-Track-Nesting in *einem* Response. Bei einer Bibliothek mit 50+ Interpreten und 200+ Alben wird das Payload monster-groß (geschätzt 200KB–1MB+), die Verarbeitungszeit am Backend steigt (alle Covers suchen, alle Tracks laden), und der Client kann keine progressive Anzeige (zuerst Artists, dann Alben on-demand) realisieren.

DS splittet in 3 Endpoints (`/artists`, `/albums?artist=`, `/tracks?artist=&album=`), was gestaffeltes Laden via TanStack Query erlaubt: Artists laden (~2KB), dann auf Klick Alben (~5KB), dann auf Klick Tracks (~10KB).

**Fix:** Den Music-Endpoint in mindestens 2 Stufen splitten: `GET /media/music/artists` (flach, nur Name + AlbumCount) und `GET /media/music/albums/:artist` (+ optional `/tracks/:artist/:album`). Oder falls ein Batch-Endpoint gewünscht ist: Query-Parameter `?depth=artists|albums|tracks` zur Steuerung der Verschachtelungstiefe.

### S2 — Keine Auth/Authorization in API-Definitionen

MIMO definiert Endpoints ohne Guards, ohne Permission-Checks und ohne Owner-Filter. Der Browse-Endpoint hat keinen `ownerId`-Parameter, der Music-Endpoint filtert nicht nach Benutzer. DS spezifiziert `JwtGuard + PermissionGuard (media:read)` und übergibt `ownerId` aus dem JWT-Payload explizit an jede Service-Methode. Bei MIMO könnte (in der aktuellen Form) User A die Quelle von User B browsen.

**Fix:** Jeden Endpoint um `@UseGuards(JwtGuard, PermissionGuard)` und `@Permissions('media:read')` ergänzen. Service-Methoden benötigen `ownerId: string` als ersten Parameter.

### S3 — PlayerContext vs. Projekt-Konvention

MIMO verwendet `useReducer` + Context API für den globalen Player-State. Das Projekt nutzt *laut TECH_STACK.md und DS' Architektur* bereits **Zustand** als State-Manager (für andere globale States wie Theme, Layout). Context + `useReducer` ist nicht falsch, aber eine zweite State-Lösung parallel zu Zustand erhöht die kognitive Last und verhindert die Nutzung von Zustand-DevTools (Redux-Devtools-Chrome-Extension).

DS setzt auf `lib/player-store.ts` mit Zustand, konsistent zur restlichen App.

**Fix:** `PlayerContext` + `useReducer` durch Zustand-Store ersetzen (siehe DS §7.2). Die API (`play`, `togglePlay`, `next`, `prev`, `volume`, `repeat`, `shuffle`) bleibt identisch.

### S4 — Fehlerbehandlung nur als Randnotiz

MIMO erwähnt "403 → Toast" im Edge-Cases-§3.3, spezifiziert aber keine Error-States für:
- Backend nicht erreichbar (Network Error → Loading-Spinner dreht ewig)
- Quelle gelöscht während Browse (404 → leeres Grid ohne Kontext)
- Musik-Endpoint schlägt fehl (500 → "Keine Audiodateien" ist irreführend)
- Auth-Token abgelaufen (401 → stumm fehlschlagende API-Calls)

DS ist hier marginal besser (erwähnt "Error-State: Quelle nicht indexiert"), aber ebenfalls lückenhaft.

**Fix:** Jeder `useQuery`-Hook braucht ein `error`-Prop → dedizierte `ErrorState`-Komponente mit Retry-Button und kontextspezifischer Meldung. In der Lightbox: Broken-Image-Fallback statt kaputtem `<img>`.

### S5 — Slideshow überspringt Videos ohne UI-Hinweis

§6.4 (Phase 1 Slideshow zeigt nur Bilder, Videos werden übersprungen) — aber der User sieht nicht, *warum* die Slideshow plötzlich 3 statt 10 Bilder hat und wo die Videos bleiben. DS spezifiziert denselben Filter (`files.filter(isImage)`), dokumentiert aber nicht, ob das für den User sichtbar ist.

**Fix:** Entweder (a) einen Zähler einblenden "Zeigt 5 von 8 Bildern (3 Videos übersprungen)" oder (b) die Slideshow-Start-Queue um einen kurzen Video-Thumbnail-Stillstand ergänzen. Minimal: Tooltip im Slideshow-Button "Nur Bilder werden in der Diashow gezeigt."

---

## Vergleich: MIMO v1 vs DS v1

| Kriterium | MIMO v1 | DS v1 | Bewertung |
|-----------|---------|-------|-----------|
| **Backend-Endpoints** | 2 (browse + music/library monolithisch) | 4 (browse + 3 getrennte Music-Endpoints) | **DS besser** — granularer, cache-freundlicher |
| **Auth-Definition** | Keine Guards | `JwtGuard + PermissionGuard` an jedem Endpoint | **DS besser** — sicherheitskonform |
| **Backend-Logik** | Path-Parsing für Musik (relativ simpel) | Path-Parsing + Album-Cover-Suche mit Fallback-Kette | **DS minimal besser** — Cover-Fallback detaillierter |
| **Frontend-State** | Context API + useReducer (PlayerContext) | Zustand Store (player-store.ts) | **DS besser** — konsistent zum Projekt-Stack |
| **Komponenten-Aufteilung** | Tief (13 Komponenten, tiefe Hierarchie) | Flach (6 Dateien, weniger Komponenten) | **Gleichwertig** — MIMO modularer, DS pragmatischer |
| **Datenfluss-Doku** | TanStack Query Keys (3 Keys) | Vollständige Matrix: 12 Keys + Invalidierungs-Table | **DS besser** — systematischer |
| **Edge Cases** | Tabellarisch §9 (10 Zeilen) | Prosa §9 (9 Abschnitte) | **MIMO besser** — kompakter, direkt lösungsorientiert |
| **Paginierung** | Erwähnt bei "1000+ Dateien" | Explizit auf Phase 2 verschoben | **Gleichwertig** — beide schieben auf |
| **Implementierungsplan** | 5 Phasen (1A–1E) mit Tagen | 5 Phasen (1a–1e) mit Datei-Liste | **DS besser** — Datei-precise, keine Interpretationslücke |
| **Lightbox-Zoom** | Minimal (1x–5x, Mausrad, Pinch, DoubleClick) | Minimal (0.5x–5x, Mausrad, DoubleClick-Reset) | **Gleichwertig** — MIMO hat Pinch-Zoom, DS hat Reset |
| **Video-Integration** | Vidstack (wie DS) | Vidstack + MIME-Type-Mapping + stream-type | **DS minimal besser** — mehr Vidstack-Konfiguration |
| **Mobile** | Swipe + Pinch erwähnt | Touch-Ziele + Overflow + Breakpoints konkret | **DS besser** — konkrete Werte |

## Was sollte in den Final-Plan übernommen werden?

| Idee | Übernehmen? | Begründung |
|------|-------------|------------|
| Tabellarische Edge Cases (§9) | **Ja** | Prägnanter als DS-Fließtext, direkt testbar |
| `PlayerProvider` mit `{children} + AudioPlayer` (§7.4) | **Ja** | Korrekte Architektur für persistenten Mini-Player |
| Pinch-to-Zoom in Lightbox (§4.2) | **Ja** | Mobile-Geste, geringer Aufwand |
| Kein ID3-Tag-Parsing (§1.3) | **Ja** | Korrekte Abwägung für NAS-Bibliothek mit konsistenten Pfaden |
| Monolithischer Music-Endpoint (§1.3) | **Nein** | Durch 3 DS-Endpoints ersetzen — payload-schonender, cache-freundlicher |
| Context API statt Zustand (§7.4) | **Nein** | Zustand ist Projekt-Konvention (TECH_STACK.md) |
| Fehlende Auth-Guards | **Nein** | DS' `JwtGuard + PermissionGuard` übernehmen |
| Diashow-State-Maschine (§6.1) | **Ja** | START-Übergang + Loop-Destinationen präziser als DS |

## Was sollte NICHT übernommen werden?

1. **Monolithischer Music-Endpoint** (`GET /media/music/library`) — zu schwer, nicht progressiv ladbar. DS' 3-Endpoint-Architektur ist überlegen.
2. **Context API für Player-State** — das Projekt nutzt Zustand. `useReducer` + Context führt zu parallelen State-Lösungen ohne Mehrwert.
3. **Fehlende Auth-Spezifikation** — MIMO definiert keine Guards. Ohne `ownerId`-Filter sind Cross-User-Datenleaks möglich. DS' Auth-Schicht ist zwingend zu übernehmen.
4. **Keine Fehler-Query-States** — MIMO behandelt Errors nur als "Toast" (403). Das reicht nicht für Network-Error, 500, 404 oder Token-Ablauf.

---

## Fazit

MIMO v1 ist ein **solider, pragmatischer Entwurf** mit klaren Stärken in der Edge-Case-Dokumentation (Tabelle), der Architektur-Entscheidung gegen ID3-Tag-Parsing und der Diashow-State-Maschine. Die Komponenten-Tiefe ist gut durchdacht.

Die **drei kritischen Lücken** sind: (1) monolithischer Music-Endpoint statt granularer 3-Endpoint-Struktur, (2) fehlende Auth/Authorization-Definition (Cross-User-Datenleak-Risiko), (3) Context API statt Zustand (Projekt-Konventionsbruch).

**Aufwandskorrektur:** MIMO schätzt ~7–10 Tage. Durch Übernahme der DS-Musik-Endpoints + Auth-Schicht + Zustand-Store kommen ~1–2 Tage dazu. Realistische Schätzung: **~9–12 Tage** für eine produktionsreife Implementierung.

*Der finale Plan sollte das Komponenten-Modell von MIMO (§2.1) mit der DS-Backend-Architektur (§1.1–1.4), Auth-Guards (§1.1) und Zustand-Store (§7.2) kombinieren.*
