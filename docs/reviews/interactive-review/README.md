# LifeHub Interactive Review App

Die beiden Review-HTMLs sind eigenständige, interaktive Arbeitsflächen:

- `../2026-08-22_lifehub_ui_design_review.html`
- `../2026-08-22_lifehub_code_functionality_review.html`

Sie benötigen keinen Webserver und keine externen Bild-, Script- oder CSS-Dateien. Vollbilder und Thumbnails sind als `data:image/...` eingebettet.

## Bedienung

### Findings und Bereiche

- Links liegt die Timeline mit **Review R1/R2/...**, aktuellem Entwurf und abgeschlossenen **Änderungsanforderungen v1/v2/...**.
- Oben filtern die P0–P3-Karten die Priorität.
- Zusätzlich gibt es Entscheidungsfilter und Volltextsuche.
- Jeder Bereich besitzt einen eigenen Tab und einen allgemeinen Kommentar.
- Jeder Bereich besitzt einen gemeinsamen Fixvorschlag.
- Jedes Finding enthält genau einen direkten Fixvorschlag und ein Akzeptanzkriterium.
- Jeder Fix kann **übernommen**, **abgelehnt** oder mit **„Anders/Kommentar“** überschrieben werden.
- Jedes Finding besitzt zusätzlich ein freies Kommentarfeld.

### Bilder markieren

1. Lupe an einem Thumbnail anklicken.
2. `Rechteck` oder `Kreis` wählen.
3. Auf dem Bild ziehen.
4. Jede Markierung erhält eine stabile Nummer und ein eigenes Kommentarfeld.
5. Koordinaten werden normiert (0–1) gespeichert; Marker bleiben beim Skalieren dem Bild zugeordnet.
6. `Undo` entfernt die letzte Markierung des geöffneten Bildes; einzelne Marker lassen sich separat löschen.

### Speicherung

- Entwürfe werden automatisch und reportgetrennt in `localStorage` gespeichert.
- UI- und Code-Review besitzen verschiedene Storage-Keys.
- Für Portabilität und Backups sollte regelmäßig **Entwurf exportieren** verwendet werden.
- **Feedback importieren** akzeptiert Schema 2 sowie die alte Schema-1-Struktur des LifeHub-Mobile-Reviews.

## Abschluss und Änderungsanforderungen

`Änderungsanforderung abschließen` erzeugt die nächste Version:

- erster Abschluss → **FA v1**
- weitere Änderung nach v1 → **FA v2**
- unveränderter erneuter Abschluss → keine redundante Version

Der Exportname folgt diesem Muster:

```text
<report-id>-fa-v<N>-2026-08-22.json
```

Standardmäßig landet der Download unter:

```text
C:/Users/dasil/Downloads/
```

Alternativ öffnet `Datei speichern …` den nativen Dateidialog, sofern der Browser die File System Access API unterstützt.

## Schema 2

Jede abgeschlossene Änderungsanforderung enthält:

```json
{
  "schemaVersion": 2,
  "kind": "lifehub-review-change-request",
  "reportId": "lifehub-ui-review-2026-08-22",
  "reviewVersion": 1,
  "reviewFingerprint": "...",
  "changeRequestVersion": 2,
  "baseChangeRequestVersion": 1,
  "exportedAt": "...",
  "fullState": {
    "findings": {},
    "areas": {},
    "markers": []
  },
  "deltaFromPrevious": {
    "operations": [],
    "changedFindingIds": [],
    "unchangedFindingCount": 0,
    "changedAreaIds": [],
    "changedMarkerIds": []
  },
  "actionSummary": {
    "acceptedSuggestions": [],
    "rejectedSuggestions": [],
    "acceptedAreaSuggestions": [],
    "rejectedAreaSuggestions": [],
    "customComments": [],
    "areaComments": [],
    "markerComments": []
  },
  "agentInstructions": {}
}
```

`fullState` ist immer die vollständige neueste Wahrheit. `deltaFromPrevious` enthält nur Änderungen gegenüber der direkt vorherigen FA-Version.

## Agentenlogik bei der Umsetzung

Wenn Robert lediglich sagt **„Review abgeschlossen, umsetzen“**, geht der Agent so vor:

1. In `C:/Users/dasil/Downloads/` und dem Reviewordner nach Dateien mit passender `reportId` suchen.
2. Die höchste `changeRequestVersion` wählen.
3. Prüfen, welche FA-Version bereits umgesetzt wurde.
4. Entscheidung:
   - **Keine frühere FA umgesetzt oder Versionslücke:** `fullState` der neuesten Datei verwenden.
   - **Direkte Vorgängerversion umgesetzt:** nur `deltaFromPrevious` anwenden.
   - **Mehrere Dateien vorhanden, aber keine umgesetzt:** nur die neueste Datei nötig; deren `fullState` enthält v1 und v2 vollständig.
5. Nur akzeptierte Fixes und explizite Nutzerkommentare umsetzen. Abgelehnte Fixes nicht umsetzen.
6. Marker über `imageId`, `findingId`, `areaId`, Nummer und normierte Koordinaten eindeutig zuordnen.
7. Nach der Implementierung eine neue Review-Version R2 erzeugen, stabile Finding-IDs beibehalten und `changedIn`/Status aktualisieren.

## Review-Versionen R1/R2

Review-Versionen und Änderungsanforderungen sind getrennte Achsen:

- **Review R1/R2:** Agentenseitige Bewertung des Produktstands nach Implementierung.
- **FA v1/v2:** Nutzerseitige Entscheidungen und Änderungswünsche zu einem Review.

Die Engine unterstützt mehrere Einträge in `window.REVIEW_VERSIONS`. Beim Erzeugen von R2:

1. R1-Daten unverändert behalten.
2. R2 als zweites Datenobjekt einbetten.
3. stabile IDs weiterverwenden;
4. neue Findings erhalten neue IDs;
5. entfernte Findings bleiben im R1-Snapshot sichtbar;
6. `Review-Diff` zeigt neu/geändert/unverändert/entfernt.

Historische Review- und FA-Snapshots sind read-only.

## Jellyfin-Deep-Coverage

- `../evidence/2026-08-22-lifehub/jellyfin-music-coverage.csv` — 40 Musikzustände
- `../evidence/2026-08-22-lifehub/jellyfin-video-coverage.csv` — 22 Film-/Serienzustände
- alle 62 Bilder sind im Codebericht unter den beiden Jellyfin-Tabs eingebettet.

## Entwicklung und Tests

```bash
python docs/reviews/interactive-review/build_interactive_reviews.py
python -m unittest docs/reviews/interactive-review/tests/test_build_interactive_reviews.py
node --test docs/reviews/interactive-review/tests/review-state-core.test.cjs
CDP_PORT=9231 node docs/reviews/interactive-review/tests/interactive-review-browser.test.mjs
```

Der Browser-Test prüft:

- standalone ohne HTTP-Netzwerkzugriffe;
- getrennte Storage-Namespaces;
- Tabs, Counts und Desktop-Wrap;
- Kommentare und Entscheidungen;
- Rechteck/Kreis samt Markerkommentar;
- Autosave und Reload;
- FA v1/v2 Vollzustand + Delta;
- historische Read-only-Timeline;
- 40/22 Jellyfin-Galeriezustände;
- 375×812 ohne seitenweites horizontales Overflow;
- keine JavaScript-Ausnahmen.
