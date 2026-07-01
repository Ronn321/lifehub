# Kritik: `jellyfin_fixes_ds_v1.md` (DS-Design)

Von: mimo-v2.5-free
Erstellt: 2026-06-19
Vergleich: `jellyfin_fixes_mimo_v1.md`

---

## 1. Stärken

1. **Vollständige Root-Cause-Analyse mit Jellyfin-API-Details (P2, P3, P7)**  
   DS explainiert exakt, warum `ParentId` vs. `ArtistIds` fehlschlägt (P2), warum `chunked` Transfer-Encoding Probleme macht (P3), und warum `repeat: 'one'` ohne explizites `.play()` pausiert bleibt (P7). MIMO hat nur oberflächliche "mögliche Ursachen"-Listen.

2. **Detaillierter Backend-Code mit konkreten Signaturänderungen (§Zusammenfassung)**  
   DS liefert eine Tabelle mit exakten Dateien, Zeilennummern und API-Signaturen (z.B. `getLibraryContents()`, dynamische CORS-Headers, MIME-Type aus Jellyfin-Response). Ein Entwickler kann direkt implementieren ohne zu raten.

3. **Explizite MIME-Type-Diagnose bei Audio/Video (P3, P7)**  
   DS identifiziert das Problem: `type: 'video/mp4'` hardcoded vs. Jellyfin liefert mkv/webm. Das gleiche bei Audio: `mimeType: 'audio/mpeg'` obwohl FLAC/OGG möglich ist. MIMO fehlt diese Analyse — es schlägt nur "Content-Type muss korrekt sein" vor ohne die Root Cause.

4. **Fehlerbehandlung mit Debug-Output (P3 Fix 6, P7 Fix 3)**  
   DS fügt `console.error('[MediaPlayer] Vidstack error:', e)` und explizite Audio-Fehler-Codes hinzu. MIMO hat nur "setzt eine Fehlermeldung" ohne Debug-Informationen.

5. **Schlüssel-Problem-Verknüpfung P2 ↔ P6**  
   DS erkennt klar, dass P6 (Alben nicht öffnbar) derselbe Bug wie P2 (falsche ArtistIds) ist. MIMO behandelt P6 als eigenständiges Problem und schlägt nur UX-Verbesserungen vor, nicht den eigentlichen Fix.

---

## 2. Schwächen

1. **Keine Breadcrumb-State-Maschine wie MIMO**  
   DS beschreibt Breadcrumb als "bestehender `FolderBreadcrumb` mit `ChevronRight`" ohne State-Modell. MIMO liefert ein explizites Discriminated Union (`level: 'root' | 'folder'`) mit `folderId` und `folderName` — klare State-Transitions und Deep-Link-fähig.

2. **Keine Type-Filter-Logik für FolderBrowser**  
   DS zeigt keine Filterung nach Library-Typ. MIMO definiert `ALLOWED_TYPES` pro Library (`movies: ['movie', 'video', 'folder']`), was verhindert, dass eine Music-Library versehentlich Film-Items anzeigt.

3. **Zu viele Backend-Änderungen vorgeschlagen**  
   DS will einen neuen Endpoint `GET /jellyfin/browse/:serverId?parentId=` erstellen. MIMO zeigt, dass der existierende `GET /jellyfin/servers/:serverId/items/:externalId/children` bereits funktioniert — kein neuer Endpoint nötig. Weniger Backend-Code = weniger Wartung.

4. **Slideshow als eigenständige Komponente (P5) — Over-Engineering**  
   DS erstellt eine separate `PhotoSlideshow`-Komponente mit Fullscreen-Overlay, Timer-Ref, Speed-Selector. MIMO integriert Slideshow als 30-40 Zeilen Erweiterung des `PhotoLightbox` — gleiche Funktionalität, halbe Komplexität.

5. **Kein Constraints-Check am Ende**  
   DS hat kein systematisches Check-Listing der Constraints (keine neuen Pakete, keine neuen DB-Tabellen, TypeScript strict). MIMO listet jeden Constraint mit ✅/❌ auf — das verhindert unbeabsichtigte Abweichungen.

---

## 3. Übernahme-Entscheidungen

| Element | Übernahme? | Grund |
|---------|-----------|-------|
| `ALLOWED_TYPES`-Filter pro Library-Typ (MIMO §2.2) | Ja | Verhindert Mixed-Type-Inhalte in Libraries |
| Root-Cause-Analyse für `ArtistIds` vs. `ParentId` (DS §P2) | Ja | Exakte Jellyfin-API-Diagnose — kritisch für den Fix |
| Existierenden `children`-Endpoint nutzen statt neu bauen (MIMO §P1) | Ja | Kein neuer Endpoint = weniger Backend-Änderungen |
| MIME-Type dynamisch aus Jellyfin-Response (DS §P3, §P7) | Ja | Verhindert Player-Fehler bei mkv/webm/FLAC/OGG |
| `repeat: 'one'` Fix mit explizitem `.play()` (DS §P7 Fix 5) | Ja | Kritischer Bug, den MIMO nicht adressiert |
| CORS-Origin dynamisch aus Request (DS §P3 Fix 1) | Ja | Produktionstauglich, nicht nur localhost |
| Discriminated Union State-Modell (MIMO §P1) | Ja | Klarere State-Transitions als DS's flache useState |
| Slideshow als Lightbox-Erweiterung (MIMO §P5) | Ja | Weniger Komplexität als separate Komponente |
| Separate `PhotoSlideshow`-Komponente (DS §P5) | Nein | Over-Integration in Lightbox ist ausreichend |
| Neuer Endpoint `GET /jellyfin/browse/:serverId` (DS §P1) | Nein | Existierender `children`-Endpoint deckt das ab |
| Constraints-Check-Tabelle (MIMO §ende) | Ja | Pflicht-Check vor Implementierung |

---

## 4. Gesamtvergleich

| Dimension | DS | MIMO |
|-----------|-----|------|
| Root-Cause-Tiefe | **Hoch** (Jellyfin-API-spezifisch) | Mittel (allgemeine Vermutungen) |
| Backend-Änderungen | Mehr (neuer Endpoint, CORS, MIME) | Weniger (existierende Endpoints nutzen) |
| State-Modell | Flach (useState) | **Discriminated Union** (klar) |
| Type-Safety | Gut (TypeScript-Schnipsel) | **Besser** (ALLOWED_TYPES Record) |
| Error-Handling | **Detailliert** (Debug-Output, Error-Codes) | Minimal (Text-Meldung) |
| Scope-Disziplin | Mittel (neue Komponenten) | **Gut** (Integration statt Separation) |
| Umsetzbarkeit | Direkt kopierbar | Muss Root-Cause-Analyse ergänzen |
| Constraints-Check | Fehlt | **Vollständig** |

**Empfehlung:** MIMO als Architektur-Grundlage (State-Modell, Type-Filter, Integration statt Separation, Constraints), DS's Root-Cause-Analyse und Error-Handling-Details für die Implementierung übernehmen. Hybrid-Ansatz: MIMO's Struktur + DS's Tiefe.

---

*Erstellt als Kritik von mimo-v2.5-free zu `designs/jellyfin_fixes_ds_v1.md`.*
