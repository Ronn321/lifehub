# LifeHub Mobile-Apps (Android / iOS / Google TV)

> **Stufe 1 — WebView-Shell.** Die App ist eine native Hülle um das bestehende
> LifeHub-Webfrontend. Das **Web bleibt Single Source of Truth** — es gibt keinen
> Nachbau der 17 Domänen-Seiten in Flutter. Der Code lebt im eigenen Repo
> **`D:\LifeHub-Mobile`** (Flutter, git `master`).

## Ausbaustufen

| Stufe | Beschreibung | Status |
|---|---|---|
| **1 — WebView-Shell** | App lädt das Webfrontend, native Settings + TV-Steuerung. Web = Single Source of Truth. | **JETZT (umgesetzt)** |
| **2 — Hybrid** | Einzelne Screens nativ in Flutter (z. B. Jellyfin-/Medien-Browser), Rest im WebView. Erst bei konkretem Bedarf pro Screen. | offen |
| **3 — Eigenständige App** | Vollständig native Flutter-UI, Web nur noch Referenz. Langfrist-Ziel, großer Aufwand. | offen |

**Ziele:** Smartphone/Tablet (Flavor `phone`) + Google TV Streamer 4K (Flavor `tv`,
Leanback). iOS-Build auf diesem Windows-PC nicht möglich (braucht macOS/Xcode) —
Code wird iOS-kompatibel gehalten, Build später über CI (Codemagic / GitHub-Actions).

## Architektur

- **1 Codebase, 3 Geräteprofile** (`phone` / `tablet` / `tv`), Android-Flavors über die Dimension `device`.
- `webview_flutter` zeigt das Webfrontend; `shared_preferences` speichert die App-Settings;
  `http` prüft die Server-Erreichbarkeit.
- Die App injiziert die Einstellungen per JavaScript ins WebView (`runJavaScript`).
- Der Web-Auth-Zustand liegt in `localStorage['lifehub-auth']` → Login läuft komplett im WebView,
  kein nativer Login nötig.

## Wie die Web-Integration funktioniert

Das Webfrontend (LifeHub-Repo, `apps/frontend`) stellt vier kleine Erweiterungen bereit,
die die App nutzt:

| Mechanismus | Datei / Ort | Zweck |
|---|---|---|
| `lifehub:sidebar:hidden` (localStorage) | `src/lib/nav-filter.ts` + `src/components/sidebar.tsx` | Nav-Items per Href-Liste ausblendbar |
| `?client=…` Query + `lifehub:client` (localStorage) | `src/lib/client-mode.ts` | Gerätetyp beim ersten Laden übergeben, persistieren, TV-Modus setzen |
| `html.lifehub-tv` (CSS-Klasse) | `src/app/globals.css` | TV-Skalierung, Fokusringe, große Hit-Targets |
| `window.lifehubTvFocus(dir)` / `window.lifehubTvClick()` | `src/lib/tv-focus.ts` | Geometrische D-Pad-Navigation + Klick für die App |
| `window.__lifehubNav` | `src/components/sidebar.tsx` | App liest die echte Nav-Liste (Single Source) |

**Ablauf:** Die App lädt `http://<server>/dashboard?client=<mode>`. Die Web-App persistiert
den Mode in `localStorage` (so geht er bei interner Navigation nicht verloren) und setzt bei
`tv` die CSS-Klasse `lifehub-tv`. Nach dem Laden injiziert die App die ausgeblendete Sidebar-
Liste als `localStorage['lifehub:sidebar:hidden']` (bei Änderung einmaliger Reload). Im
TV-Modus steuert die Flutter-App den Web-Fokus per `window.lifehubTvFocus(...)` /
`window.lifehubTvClick()`.

## Konfiguration

| Parameter | Default | Beschreibung |
|---|---|---|
| `serverUrl` | `http://100.124.4.24:3100` | LifeHub-Frontend (nur mit aktivem Tailscale erreichbar) |
| `clientMode` | `phone` (tv-Flavor: `tv`) | Geräteprofil |
| `hiddenNav` | TV: nur Jellyfin/Medien/Suche sichtbar; Phone: alles sichtbar | Per SettingsScreen editerbar |
| `--dart-define=LIFEHUB_PROFILE=tv` | — | setzt den `tv`-Default-Client-Mode |

## Build

Siehe `D:\LifeHub-Mobile\README.md` (Build-Befehle, RAM-Prozedur, Installation).
Kurz:

```bash
cd /d/LifeHub-Mobile
export GRADLE_USER_HOME="D:/gradle-cache"
flutter build apk --debug                                    # Phone
flutter build apk --debug --flavor tv --dart-define=LIFEHUB_PROFILE=tv   # TV
flutter build apk --release                                  # Phone Release (Debug-Keystore)
```

Release ist mit dem Debug-Keystore signiert — ok fürs Sideloading, für den Play Store
später eine eigene Signing-Config nötig.

## Netzwerk / Firewall / Tailscale

- **Voraussetzung:** LifeHub-Docker-Stack läuft auf dem PC (Frontend `:3100`, Backend `:3007`).
- **Tailscale:** gleicher Account (`robert-d-az`) auf PC und Zielgerät. PC-Tailscale-IP: `100.124.4.24`.
- **Windows-Firewall:** eingehend `3100`/`3007` für die **Tailscale-Schnittstelle** erlauben,
  sonst ist der Server vom Gerät aus nicht erreichbar. Falls blockiert (Admin):
  ```bash
  netsh advfirewall firewall add rule name="LifeHub-Mobile" dir=in action=allow protocol=TCP localport=3100,3007
  ```
- Die API-Basis wird im Web aus `window.location.hostname` abgeleitet → funktioniert im
  WebView automatisch, egal welche IP eingetragen ist.

## Fehlerbehandlung

Die App zeigt bei nicht erreichbarem Server eine deutsche Fehlermeldung
(„Server nicht erreichbar — läuft Tailscale? Läuft Docker auf dem PC?") mit
„Erneut versuchen" und „Einstellungen", statt eines weißen Bildschirms.

## Geräte-Installation

### Xiaomi (USB-Debugging)
USB-Debugging aktivieren → per `adb install` oder APK-Sideload installieren.

### Google TV Streamer 4K
Entwickleroptionen → **Netzwerk-Debugging** AN → TV-IP ermitteln →
`adb connect <tv-ip>:5555` → `adb install app-tv-debug.apk`.
Alternativ: APK auf USB-Stick + „Send files to TV"-App, oder Downloader-URL.

## Screenshots

<!-- TODO: Screenshots hier einfügen -->
- Phone: Dashboard, SettingsScreen (Sidebar-Editor), WebView mit ausgeblendeter Sidebar
- TV: TV-Startbildschirm (Kacheln), Jellyfin-WebView mit D-Pad-Fokusring

## iOS-Hinweis

Build/Test nur auf macOS möglich (Xcode). Empfohlener Weg ohne eigenen Mac: Codemagic
oder GitHub-Actions-macOS-Runner → `flutter build ipa --release` → TestFlight.
Einzige iOS-Spezifika sind die ATS-Ausnahme (`NSAllowsArbitraryLoads`) und
`NSLocalNetworkUsageDescription` in `ios/Runner/Info.plist`.
