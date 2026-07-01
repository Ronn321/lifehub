# PLAN.md

# LifeHub
## Private Self-Hosted Family Operating System

---

## 1. Vision

LifeHub ist eine private, selbst gehostete Webplattform für die Organisation des gesamten Familien- und Privatlebens.

Der Server läuft auf einem NAS und ist innerhalb des lokalen Netzwerks sowie über Tailscale erreichbar.

Ziel ist die zentrale Verwaltung von:

- Fotos
- Videos
- Dokumenten
- Familienfinanzen
- Versicherungen
- Konten
- Passwörtern
- Hobbys
- Projekten
- Rezepten
- Einkaufslisten
- Kalendern
- Haus-IT
- Medienbibliotheken

LifeHub soll langfristig die zentrale digitale Plattform für die gesamte Familie werden.

---

## 2. Design Vision

**Designprinzipien:**

- Modern
- Hochwertig
- Minimalistisch
- Apple-Level UX
- Netflix-Level Medienansicht
- Google Photos Inspiration
- Notion Inspiration
- Plex/Jellyfin Inspiration

**Design Referenzen:**

- https://github.com/voltagent/awesome-design-md

**Fokus:**

- Dark Mode
- Light Mode
- Glassmorphism
- Sanfte Animationen
- Responsive Design
- Mobile First
- Desktop Optimiert

---

## 3. Technischer Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- ShadCN UI
- Framer Motion
- TanStack Query

### Backend
- Node.js + NestJS
- **oder**
- FastAPI (Python)
- Entscheidung während Architekturphase.

### Datenbank
- PostgreSQL

### Cache
- Redis

### Storage
- NAS Storage Mounts
- Beispiel:
  - `/mnt/media/photos`
  - `/mnt/media/videos`
  - `/mnt/documents`
  - `/mnt/projects`

### Containerisierung
- Docker
- Docker Compose
- Später: Kubernetes optional

### Zugriff
- Lokales Netzwerk
- Tailscale

---

## 4. Kernmodule

### 4.1 Benutzerverwaltung

**Funktionen**
- Benutzer anlegen
- Benutzer deaktivieren
- Rollen erstellen
- Rechteverwaltung

**Standardrollen**
- Administrator
- Familie
- Gast
- Kind

**Rechte**
- Lesen
- Schreiben
- Löschen
- Freigeben
- Download
- Upload
- Admin
- für jedes Modul getrennt

### 4.2 Dashboard
- Persönliches Dashboard
- Widgets:
  - Kalender
  - Wetter
  - Fotos
  - Finanzstatus
  - Sparziele
  - Aufgaben
  - Einkaufslisten
  - Medienbibliothek
  - Projektstatus
- Benutzer können Widgets frei anordnen.

### 4.3 Medienverwaltung

**Upload**
- Einzeldatei
- Mehrfachupload
- Drag & Drop
- Ordner Upload

**Quellen**
- NAS Pfade
- SMB
- NFS
- Lokale Uploads

**Medienarten**
- Fotos
- Videos
- Dokumente
- Audio

**Ansichten**
- Zeitstrahl (Jahr, Monat, Tag)
- Karte (OpenStreetMap, Leaflet, Fotos anhand GPS Daten)
- Weltkugel (3D Globe, CesiumJS oder ThreeJS)

**Alben**
- Urlaube
- Ereignisse
- Familienfeiern
- Geburtstage

**Personen**
- Gesichtserkennung (spätere Erweiterung)

### 4.4 Reiseverwaltung
- Urlaubsseiten erstellen (z.B. "Italien 2025")
- Eigene Landingpage mit:
  - Karte
  - Fotos
  - Videos
  - Reiseroute
  - Notizen
  - Dokumente

### 4.5 Hobby Management

**Bereiche:**
- 3D Druck
- Arduino
- Raspberry Pi
- Programmierung
- Elektronik
- DIY

**Funktionen**
- Projektseiten
- Dateiablage (CAD, STL, Bilder, Videos)
- Links
- Dokumentation
- YouTube Einbindung
- GitHub Einbindung
- Markdown Dokumente

### 4.6 Wissensdatenbank
- Wiki System
- Markdown basiert
- Verlinkbare Seiten
- Tags, Kategorien
- Backlinks
- Suche

### 4.7 Rezeptverwaltung
- Rezepte erstellen / importieren / kategorisieren
- Quellen: Manuell, Webseiten, YouTube, PDF
- Funktionen: Zutaten, Anleitungen, Bilder, Videos, Nährwerte, Portionen, Tags

### 4.8 Einkaufslisten
- Mehrere Listen
- Geteilte Listen
- Live Synchronisation
- Vorbereitung API für MorphCook (REST, GraphQL optional, WebSocket Updates)

### 4.9 Familienfinanzen

**Konten**
- Girokonto, Tagesgeld, Depot, Kreditkarten, Bargeld

**Buchungen**
- Einnahmen, Ausgaben, Umbuchungen

**Kategorien**
- Wohnen, Lebensmittel, Auto, Urlaub, Versicherung, Freizeit

**Sparziele**
- Urlaub, Auto, Haus, Notgroschen

**Spartöpfe**
- Virtuelle Unterkonten

**Portfolio**
- Aktien, ETF, Anleihen, Krypto, Edelmetalle

**Kennzahlen**
- Net Worth, Cashflow, Vermögensentwicklung, Sparquote

### 4.10 Versicherungen
- Versicherungsdatenbank
- Verträge, Dokumente, Nummern, Ansprechpartner, Kündigungsfristen, Beitragsübersicht

### 4.11 Passwortverwaltung
- Vaultwarden ähnliches Modul
- Speicherung: AES-256, Argon2
- Funktionen: Passwörter, PINs, Kartendaten, Kontozugänge, Dokumente, TOTP, Passkeys

### 4.12 Dokumentenverwaltung
- Verträge, Rechnungen, Garantien, Anleitungen, Behördendokumente
- OCR: Texterkennung, Suche, Verschlagwortung

### 4.13 Haus IT Verwaltung

**Inventarsystem für Geräte:**
- PCs, NAS, Router, Switches, Smart Home Geräte, Drucker, Server, IoT Geräte

**Felder**
- Name, Standort, IP Adresse, MAC Adresse, Seriennummer, Passwort Referenz, Beschreibung, Hersteller, Modell, Garantie

**Netzwerkansicht**
- Gerätegraph, Netzwerkkarte

### 4.14 Medienbibliothek
- Netflix/Plex/Jellyfin ähnliche Ansicht
- Inhalte: Filme, Serien, Dokumentationen, Musik
- Integration primär Jellyfin API, Fallback direkte NAS Quellen
- Funktionen: Poster, Staffeln, Folgen, Metadaten, Suche, Fortsetzen, Watchlist, Trailer

### 4.15 Kalender
- Mehrere Kalender
- Integration: Google Calendar, CalDAV, ICS, Outlook
- Funktionen: Monat, Woche, Tag, Familienkalender, Geburtstage, Erinnerungen

### 4.16 Suche
- Globale Suche über: Fotos, Projekte, Rezepte, Dokumente, Geräte, Finanzen, Filme, Versicherungen

---

## 5. Erweiterungssystem

- Plugin System
- Ziel: Nutzer sollen Module hinzufügen können
- Beispiele: Smart Home / Home Assistant, KI Assistent, Fitness Tracker, Fahrzeugverwaltung

---

## 6. API

- REST API
- OpenAPI Dokumentation
- JWT
- OAuth2
- API Keys
- Webhook Support

---

## 7. Sicherheit

- HTTPS
- Tailscale Only Optional
- 2FA
- Passkeys
- RBAC
- Audit Logs
- Backup System
- Versionierung
- Verschlüsselung sensibler Daten

---

## 8. Backup

- Automatische Backups
- Datenbank
- Dateien
- Passwortdaten
- Konfiguration
- Versionierte Wiederherstellung

---

## 9. Mobile Zukunft

- MorphCook Integration
- Android App
- iOS App
- Offline Modus
- Push Benachrichtigungen

---

## 10. Entwicklungsphasen

### Phase 1
- Benutzerverwaltung
- Dashboard
- Dateiverwaltung
- Fotos
- Videos
- NAS Integration

### Phase 2
- Reisen
- Projekte
- Wiki
- Rezepte
- Einkaufslisten

### Phase 3
- Finanzen
- Versicherungen
- Dokumente
- Passwortmanager

### Phase 4
- Jellyfin
- Kalender
- API
- Mobile Integration

### Phase 5
- Plugin System
- KI Assistent
- Smart Home Integration
- Home Assistant
- Automatisierungen

---

## Ziel

Eine vollständig selbst gehostete Familienplattform, die langfristig als zentrale digitale Schaltstelle für das gesamte Privatleben dient.

---

## Begleitende Dokumente

Für OpenCode/Hermes werden zusätzlich empfohlen:

- **ARCHITECTURE.md** — Datenbankmodell, Microservice-Aufteilung, API-Struktur, Docker-Architektur, NAS-Mount-Konzept
- **UI_UX.md** — Vollständiges Design-System basierend auf Awesome Design MD, Farbpalette, Komponentenbibliothek, Navigation, Mobile/Desktop Layouts
- **ROADMAP.md** — Konkrete Umsetzung in Epics, Features und Tasks, Priorisierung nach MVP → V1 → V2 → V3

Empfohlene Architektur: Domain-Driven-Design (DDD) mit getrennten Modulen (Media, Finance, Vault, Projects, Recipes, IT, Calendar, Jellyfin), damit die Plattform über Jahre erweiterbar bleibt.
