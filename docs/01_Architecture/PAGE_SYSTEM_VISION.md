# PAGE_SYSTEM_VISION.md

# LifeHub – Vision für die Pages Domain

Version: 1.0

Status: Architectural Proposal

---

# Ziel dieses Dokuments

Dieses Dokument beschreibt die langfristige Vision der neuen **Pages Domain**.

Es handelt sich **nicht** um eine direkte Implementierungsvorgabe, sondern um eine Architekturentscheidung, die als Grundlage für zukünftige Entwicklungen dient.

Die Pages Domain wird zunächst **ergänzend** zur bestehenden Architektur eingeführt.

**Bestehende Domains dürfen während der Einführung nicht verändert oder beschädigt werden.**

Die vorhandene Struktur dient weiterhin als funktionierende Grundlage.

Die Pages Domain wird zunächst parallel aufgebaut und kann später schrittweise von anderen Bereichen genutzt werden.

---

# Ausgangssituation

Die aktuelle Architektur besitzt mehrere eigenständige Domains, beispielsweise:

* Travel
* Projects
* Recipes
* Finance
* Insurance
* IT Inventory
* Documents
* Vault

Jede dieser Domains besitzt heute ihre eigene Benutzeroberfläche.

Dadurch entstehen mehrere Probleme:

* ähnliche UI-Komponenten werden mehrfach entwickelt
* Upload-Funktionen unterscheiden sich je nach Domain
* Bilder werden unterschiedlich dargestellt
* Dokumente werden unterschiedlich verwaltet
* Tabellen existieren mehrfach
* Links und Notizen besitzen unterschiedliche Darstellungen
* zukünftige Erweiterungen müssen mehrfach implementiert werden

Diese Entwicklung würde langfristig zu einer schwer wartbaren Codebasis führen.

---

# Langfristige Vision

LifeHub soll sich von einer Sammlung einzelner Anwendungen zu einer gemeinsamen Plattform entwickeln.

Der zentrale Gedanke lautet:

> Alles ist eine Seite.

Nicht Reisen.

Nicht Projekte.

Nicht Versicherungen.

Nicht Haus-IT.

Sondern Seiten.

Diese Seiten können anschließend beliebig für unterschiedliche Zwecke genutzt werden.

Die eigentlichen Fachbereiche bleiben bestehen, definieren zukünftig jedoch hauptsächlich:

* Templates
* Standardmodule
* Fachlogik
* Berechtigungen
* Automatisierungen

Die eigentliche Darstellung erfolgt über die Pages Domain.

---

# Rolle der Pages Domain

Die Pages Domain wird die zentrale Benutzeroberfläche des gesamten Systems.

Sie besitzt keine eigene Fachlogik für Reisen, Projekte oder Versicherungen.

Ihre Aufgabe besteht ausschließlich darin, beliebige Inhalte strukturiert darstellen und verwalten zu können.

Sie stellt dafür ein universelles Seitensystem bereit.

---

# Was ist eine Page?

Eine Page ist ein frei gestaltbares Dokument.

Eine Page besitzt beispielsweise:

* Titel
* Symbol
* Coverbild
* Beschreibung
* Besitzer
* Berechtigungen
* Tags
* Unterseiten
* beliebig viele Inhaltsmodule

Die Reihenfolge der Module ist vollständig frei.

Module können jederzeit:

* hinzugefügt
* entfernt
* verschoben
* kopiert
* ausgeblendet
* wiederverwendet

werden.

---

# Seiten statt Spezialoberflächen

Heute besitzt jede Domain ihre eigene Oberfläche.

Beispielsweise:

Travel

* Galerie
* Karte
* Dokumente
* Notizen

Projects

* Dateien
* Links
* Bilder
* Notizen

Insurance

* Dokumente
* Vertragsdaten
* Dateien

Diese Oberflächen unterscheiden sich größtenteils nur durch ihre Zusammenstellung.

Stattdessen soll zukünftig jede dieser Seiten dieselben Grundbausteine verwenden.

Die Unterschiede entstehen lediglich durch die gewählten Module.

---

# Templates statt fester Seiten

Die vorhandenen Domains bleiben weiterhin bestehen.

Sie erzeugen zukünftig jedoch hauptsächlich Vorlagen.

Beispielsweise kann eine neue Reiseseite automatisch mit folgenden Modulen erstellt werden:

* Titel
* Hero-Bild
* Galerie
* Karte
* Zeitachse
* Dokumente
* Kostenübersicht
* Notizen

Eine Projektseite könnte stattdessen automatisch enthalten:

* Beschreibung
* Dateibereich
* GitHub-Links
* Videos
* Aufgaben
* Dokumentation

Die eigentlichen Module bleiben identisch.

Lediglich ihre Zusammenstellung unterscheidet sich.

---

# Bestehende Domains bleiben erhalten

Die Einführung der Pages Domain ersetzt zunächst keine bestehende Domain.

Alle bestehenden Bereiche bleiben vollständig funktionsfähig.

Die Pages Domain wird zunächst zusätzlich eingeführt.

Dadurch können neue Seiten bereits auf Basis des neuen Systems erstellt werden, während bestehende Bereiche unverändert weiterarbeiten.

Erst in späteren Entwicklungsphasen können einzelne Domains schrittweise auf die neue Seitentechnologie umgestellt werden.

---

# Keine Migration in Phase 1

Während der ersten Einführung gilt ausdrücklich:

* keine bestehende Domain wird entfernt
* keine bestehende API wird ersetzt
* keine Datenbanktabellen werden migriert
* keine bestehende Oberfläche wird gelöscht

Die Pages Domain entsteht vollständig parallel.

Dadurch wird das Projektrisiko erheblich reduziert.

---

# Zentrale Vorteile

Die neue Architektur bietet langfristig zahlreiche Vorteile.

## Wiederverwendbarkeit

Neue Funktionen müssen nur noch einmal entwickelt werden.

Alle Seiten profitieren automatisch davon.

## Konsistenz

Alle Bereiche besitzen dieselbe Bedienlogik.

Benutzer müssen keine unterschiedlichen Oberflächen erlernen.

## Erweiterbarkeit

Neue Seitentypen können ohne Änderungen an der Grundarchitektur entstehen.

## Wartbarkeit

Doppelte Implementierungen werden vermieden.

## Pluginfähigkeit

Neue Module können unabhängig entwickelt und später in beliebige Seiten eingefügt werden.

---

# Langfristiges Ziel

Die Pages Domain soll langfristig zum zentralen Arbeitsbereich von LifeHub werden.

Alle Inhalte des Systems sollen sich auf Basis eines gemeinsamen Seitensystems darstellen lassen.

Die eigentlichen Domains liefern dabei hauptsächlich:

* Daten
* Fachlogik
* Integrationen
* Berechtigungen
* Vorlagen

Die Darstellung übernimmt die Pages Domain.

---

# Aktueller Entwicklungsstand

Dieses Dokument beschreibt ausschließlich die Architekturvision.

Es definiert bewusst **keine** technische Umsetzung.

Insbesondere werden in diesem Dokument noch nicht spezifiziert:

* interne Datenstruktur einer Page
* Blocksystem
* Blocktypen
* Kartenmodule
* Browsermodule
* Tabellenmodule
* Markdown-Editor
* Rendering
* Plugin-Schnittstellen

Diese Themen werden in eigenen Dokumenten ausgearbeitet.

---

# Anweisung für den Agent

Bei der weiteren Entwicklung ist die Pages Domain als eigenständige neue Domain anzulegen.

Sie darf zunächst keine bestehenden Domains verändern.

Neue Funktionen können bereits auf Basis der Pages Domain entwickelt werden.

Bestehende Funktionen bleiben unverändert bestehen.

Erst wenn das Seitensystem vollständig ausgereift ist, dürfen bestehende Domains schrittweise darauf migriert werden.

Die Stabilität der vorhandenen Architektur besitzt während der gesamten Einführungsphase höchste Priorität.
