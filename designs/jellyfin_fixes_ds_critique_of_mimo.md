# Kritik: mimo v1 — DS-Perspektive

**Reviewer:** DS v1  
**Review-Datum:** 2026-06-19  
**Basis:** `jellyfin_fixes_mimo_v1.md` vs `jellyfin_fixes_ds_v1.md`

---

## Stärken (5)

1. **Problem-Enumeration mit Severity** — Die Tabelle (P1–P7) mit `Schwere`-Spalte ist klarer als die narrative Root-Cause-Map in DS. Severity priorisiert die Implementation.

2. **Zeilengenaue Code-Referenzen** — `LibraryBrowser (Zeile 1104-1116)`, `JellyfinImage (Zeile 1417-1424)` etc. Jede Aussage ist verifizierbar. DS hat das nicht in diesem Detailgrad.

3. **FolderViewState als getaggtes Union-Type** — `type FolderViewState = { level: 'root' } | { level: 'folder'; folderId: string; folderName: string }` ist sauberer als DS' einzelner `currentFolderId: string | null`. Das Union-Type schließt invalide States aus.

4. **ALLOWED_TYPES-Filter in FolderBrowser** — `Record<string, string[]>` als Type-Safety-Netz. DS hat diesen Filter nicht explizit. Sinnvolle Adoption: der Filter verhindert, dass eine `movies`-Library plötzlich `audio`-Items rendert.

5. **Constraints-Check-Tabelle** — Explizites Abhaken der Projekt-Constraints (keine neuen npm-Pakete, Tailwind, TypeScript strict, etc.). DS setzt Constraints im Header voraus, prüft sie nicht nach.

---

## Schwächen (5)

1. **P2/P6 Root Cause verfehlt** — mimo sagt: "Die API-Aufrufe korrekt. Der Bug liegt wahrscheinlich in einem dieser Bereiche: Sync-Problem, Type-Mapping, falsche Library." Das ist falsch. DS identifiziert den echten Bug: `getAlbums()` nutzt `ParentId={artistId}` statt `ArtistIds={artistId}`. Jellyfin-Artists haben keine Parent-Child-Beziehung zu ihren Alben. Bei `ParentId` returned Jellyfin entweder alle Items (weil Artist kein Folder ist) oder nichts — das erklärt "AC/DC zeigt Filme" exakt. Der vorgeschlagene Type-Filter ist ein Symptom-Klebeband, keine Ursachenbehebung. **Fix-Kosten: 1 Zeile Backend.**

2. **Keine Backend-Änderung für P1** — mimo sagt "Backend: Keine Änderungen nötigt" und will `GET /jellyfin/servers/:serverId/items/:externalId/children` wiederverwenden. Dieser Endpoint erwartet eine Item-ID, keine Library-ID. Jellyfin-Libraries haben einen eigenen `ParentId`-Mechanismus. DS sieht zu Recht einen neuen `GET /jellyfin/browse/:serverId?parentId=` Endpoint vor, der beide Fälle (Library-Root + Folder-Drill-Down) bedient. Ohne Backend-Änderung bleibt der Library-Root-Endpunkt broken.

3. **P3-Fokus auf Vidstack-Kosmetik statt Infrastruktur** — mimo optimiert `stream-type="unknown"` → `"on-demand"` und importiert `audio.css`. DS identifiziert die wahren Produktions-Bugs: Port-Hardcoding (`localhost:3007` statt konfigurierbarer API-Base-URL), dynamisches Content-Type (Vidstack bekommt hardcoded `video/mp4`, Jellyfin liefert mkv/webm), und CORS-Probleme bei Tailscale-URLs. Ein Vidstack-Preset-Fix nutzt nichts, wenn der Stream gar nicht ankommt.

4. **P6 künstlich von P2 getrennt** — mimo behandelt P6 ("Alben nicht öffnbar") als separates Problem mit eigenem Konzept. DS erkennt: P6 hat **dieselbe Ursache** wie P2 (`ParentId` statt `ArtistIds`). Das sind nicht zwei Bugs, sondern einer. Die mimo-UX-Verbesserungen (Cover, "Alle abspielen", Track-Nummern) sind nice-to-have, aber irrelevant wenn der Backend-Call leere Daten liefert.

5. **ItemsTab-Entfernung ohne Rückwärtskompatibilität** — mimo will `ItemsTab` entfernen weil "wird nicht mehr referenziert". DS behält `ItemsTab` implizit bei. Inkrementelle Entwicklung erlaubt Rollback und parallele Nutzung. Bei `ItemsTab`-Löschung führt ein einziger vergessener Import zum Build-Failure. Delete-later > delete-now.

---

## Übernahmen (was DS von mimo übernimmt)

| Element | Quelle | Grund |
|---------|--------|-------|
| `ALLOWED_TYPES`-Filter | mimo §P2, Zeile 111-117 | Safety-Netz im FolderBrowser gegen Type-Kontamination |
| `FolderViewState`-Union-Type | mimo §P1, Zeile 44-47 | Sauberer als `string \| null`, schließt invalide Zustände aus |
| Breadcrumb-Reuse (`FolderBreadcrumb`) | mimo §P1, Zeile 57-59 | Pragmatisch: existierenden Code nutzen statt neu zu schreiben |
| Aufwandsschätzung (Zeilen pro Komponente) | mimo §Zusammenfassung, Zeile 406-415 | Nützlich für Sprint-Planning — DS hat das nicht |
| PhotoLightbox + Slideshow Integration in einer Komponente | mimo §P4+P5, Zeile 236-297 | DS trennt Lightbox und Slideshow in zwei Dateien (mehr Overhead). Zusammen in einer Datei starten, später splitten wenn nötig. |
| Severity-Tabelle | mimo §Problemübersicht | DS sollte diese Darstellung für Status-Reports übernehmen |

---

## Fazit

mimo v1 ist **sorgfältig im Detail, schwach in der Ursachenanalyse**. Starke Code-Nähe (Zeilennummern, konkrete Typen, Import-Pfade) beim gleichzeitigen Verfehlen von zwei der drei Backend-Bugs (P2/P6 `ArtistIds`, P1 Library-Root-Endpoint). Die P3-Analyse bleibt an der Oberfläche (Vidstack-Konfiguration) statt die Netzwerk-Infrastruktur-Probleme zu adressieren.

**Empfohlen:** Alle mimo-Übernahmen in einen DS-Fork mergen. Die Architekturentscheidungen (FolderBrowser-Struktur, Type-Filter, Breadcrumb-Reuse) sind solide; die Bug-Analysen müssen durch DS' Root-Cause-Tiefe ersetzt werden. Der Combined-Fix ist besser als beide Einzeldokumente.
