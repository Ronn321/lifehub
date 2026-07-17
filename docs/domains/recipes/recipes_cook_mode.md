# Recipes Cook Mode

> **Spezifikation des Cook Mode für die LifeHub-Web-UI.**
> Fullscreen, Schritt-für-Schritt-Kochansicht mit Timer und Portionen-Skalierung. Funktioniert offline (IndexedDB).

---

## 1. Uberblick

Der Cook Mode ist die **primare Koch-Ansicht** im LifeHub-Frontend. Er wird im Browser ausgefuhrt und ist als PWA offline-fahig (via IndexedDB + Service Worker).

### Design-Prinzipien
- **Fullscreen, dark mode** — minimale Ablenkung beim Kochen
- **Schritt-fur-Schritt** — ein Schritt nach dem anderen, klare Navigation
- **Offline-fahig** — ladt Rezept einmal, funktioniert dann ohne Netzwerk
- **Timer pro Schritt** — optionale Timer aus `steps[].timer_seconds`
- **Portionen-Skalierung** — Zutaten live anpassen
- **Barrierefrei** — Screenreader, visuelle Timer-Alerts (fur gehorlose Nutzer)

---

## 2. URL-Struktur

```
/recipes/[id]/cook
```

Offnet den Cook Mode fur ein bestimmtes Rezept.

---

## 3. UI-Layout

```
+----------------------------------------------------+
| <- Zuruck                        1/5  + 05:00      |  Header: Schritt-Nr, Timer
|----------------------------------------------------|
|                                                     |
|           [Rezept-Bild (optional)]                  |
|                                                     |
|  +----------------------------------------------+  |
|  | Schritt 1:                                  |  |
|  | Backofen auf 180C Umluft vorheizen.         |  |
|  |                                              |  |
|  +----------------------------------------------+  |
|                                                     |
|----------------------------------------------------|
|  [++]  [||]  [>>]                   Portionen: 4  |
+----------------------------------------------------+
```

### Elemente

| Element | Beschreibung |
|---|---|
| **Zuruck-Button** | Pfeil links oben. Beendet Cook Mode mit Bestatigung. |
| **Schritt-Indikator** | `1/5` — aktueller Schritt / Gesamtschritte. |
| **Timer** | Anzeige `MM:SS`. Nur sichtbar wenn `timer_seconds > 0`. Blinkt bei 0. |
| **Schritt-Text** | Grosser, zentrierter Text. Unterstutzt Markdown (fett, kursiv). |
| **Navigation** | `++` Vorheriger Schritt, `||` Pause/Play Timer, `>>` Nachster Schritt. |
| **Portionen** | Slider oder +/- Buttons. Skaliert Zutaten live (API-Call oder Client-seitig). |
| **Fortschritt** | Punkte unten: `.......` visualisiert aktuelle Position. |

---

## 4. Zustandsautomat

```
[INIT]
  |
  v
[LOADING] --Rezept geladen--> [READY]
                                   |
                        +-----------+-----------+
                        |                       |
                        v                       v
                    [PLAYING]              [PAUSED]
                   (Timer lauft)          (Timer pausiert)
                        |                       |
                        +----------+------------+
                                   |
                                   v
                    [COMPLETED] (letzter Schritt erreicht)
```

### Zustande

| Zustand | Beschreibung |
|---|---|
| `LOADING` | Rezept wird aus IndexedDB oder API geladen. Skeleton-UI. |
| `READY` | Rezept geladen. Schritt 0 angezeigt. Timer nicht aktiv. |
| `PLAYING` | Timer lauft. Fortschrittsbalken am Timer. |
| `PAUSED` | Timer pausiert. Werte bleiben erhalten. |
| `COMPLETED` | Alle Schritte durchlaufen. Erfolgsmeldung. Option: Rezept bewerten/speichern. |

---

## 5. Timer-System

### 5.1 Timer pro Schritt

```typescript
interface StepTimer {
  seconds: number;        // Aus steps[].timer_seconds
  remaining: number;      // Verbleibende Sekunden
  isRunning: boolean;
  isCompleted: boolean;
}
```

### 5.2 Timer-Verhalten

- **Auto-Start:** Timer startet NICHT automatisch. User aktiviert manuell.
- **Pause:** Pausiert den Timer. Werte bleiben erhalten.
- **Reset:** `++` oder `>>` im pausierten Zustand setzt Timer zuruck.
- **Ablauf:** Timer = 0 → visueller Alert (Bildschirm blinkt coral/teal), optional Sound.
- **Hintergrund:** Timer lauft weiter wenn Tab im Hintergrund (Web Worker).

### 5.3 Visueller Timer-Alert

Fur Barrierefreiheit (gehorlose Nutzer):
- Bildschirm blinkt abwechselnd coral (#FF6B6B) und teal (#4ECDC4)
- 3 Zyklen a 1 Sekunde
- Danach zuruck zur normalen Ansicht
- Konfigurierbar in Settings (`visualAlertEnabled`)

---

## 6. Navigation

| Aktion | Taste | Touch-Geste | Beschreibung |
|---|---|---|---|
| Vorheriger Schritt | `++` | Swipe rechts | Geht zum vorherigen Schritt |
| Nachster Schritt | `>>` | Swipe links / Tap auf Schritt | Geht zum nachsten Schritt |
| Pause/Play | `||` / `+` | Tap auf Timer | Toggled Timer |
| Cook Mode beenden | Zuruck-Button | — | Mit Bestatigungs-Dialog |

### Quick-Tap (optional, fur Einhand-Bedienung)

- Einfacher Tap auf den Schritt-Text springt zum nachsten Schritt
- 300ms Debounce gegen versehentliche Auslosung
- Opt-in via Settings (`quickNextTapEnabled`)
- Respektiert `reduceMotion`

---

## 7. Portionen-Skalierung

### 7.1 UI

```
[2] [3] [4*] [6] [8]   (Chips)
oder
[-] 4 [+]                (+/- Buttons)
```

### 7.2 Skalierungslogik

```typescript
function scaleIngredients(ingredients: Ingredient[], factor: number): Ingredient[] {
  return ingredients.map(ing => ({
    ...ing,
    amount: ing.amount !== null
      ? (parseFloat(ing.amount) * factor).toFixed(1).replace('.0', '')
      : null,
  }));
}

// factor = newServings / originalServings
// Bsp: 4 Portionen → 8 Portionen = factor 2.0
// "200 g Mehl" → "400 g Mehl"
```

### 7.3 Spezielle Falle

- **Qualitative Angaben** ("etwas", "nach Bedarf"): nicht skalieren
- **Stuck-Angaben** ("1 Zwiebel"): skalieren (1 Zwiebel * 2 = 2 Zwiebeln)
- **Bereiche** ("1-2 Zehen"): beide Grenzen skalieren
- **Eier** ("2 Eier"): auf ganze Zahlen runden

---

## 8. Offline-Fahigkeit

### 8.1 IndexedDB-Speicherung

```typescript
// Beim Offnen des Cook Mode
async function loadRecipeForCookMode(recipeId: string) {
  // 1. Aus IndexedDB laden (Dexie.js)
  const cached = await db.recipes.get(recipeId);
  if (cached) return cached;
  
  // 2. Fallback: API-Fetch + in IndexedDB speichern
  const recipe = await fetch(`/api/v1/recipes/${recipeId}`).then(r => r.json());
  await db.recipes.put(recipe);
  return recipe;
}
```

### 8.2 Service Worker Caching

Die Cook Mode Page (`/recipes/[id]/cook`) wird vom Service Worker gecached. Einmal geladen, funktioniert sie offline.

### 8.3 Offline-Einschrankungen

| Feature | Offline verfugbar? |
|---|---|
| Rezept-Daten (Zutaten, Schritte) | Ja (IndexedDB) |
| Timer | Ja (lokal) |
| Navigation | Ja |
| Portionen-Skalierung | Ja (client-seitig) |
| Bilder | Ja (wenn gecached) |
| Rezept speichern/bewerten | Nein (braucht API) |

---

## 9. Completion Screen

Nach dem letzten Schritt:

```
+----------------------------------------------------+
|                                                     |
|                   +  Gut gemacht! +                  |
|                                                     |
|            Blumenkohlauflauf ist fertig!            |
|                                                     |
|            Dauer: 35 Minuten                         |
|                                                     |
|    [Rezept bewerten]    [Zur Ubersicht]             |
|                                                     |
+----------------------------------------------------+
```

- **Dauer:** Gemessen vom ersten bis zum letzten Schritt (ohne Pausen)
- **Bewertung:** Optional. 1-5 Sterne. Wird in `recipes.cook_history` gespeichert.
- **Zur Ubersicht:** Navigiert zuruck zur Rezept-Detailseite.

---

## 10. API-Endpunkte

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/v1/recipes/:id` | Rezept laden (einmalig) |
| `POST` | `/api/v1/recipes/:id/cook/complete` | Cook-Session abschliessen (Dauer, Bewertung) |

---

## 11. Barrierefreiheit

| Anforderung | Umsetzung |
|---|---|
| Screenreader | Alle Buttons haben `aria-label`. Schritt-Text ist `aria-live="polite"`. |
| Timer-Alert visuell | Blinken coral/teal fur Gehorlose. `visualAlertEnabled` Setting. |
| Keyboard-Navigation | `←` / `→` fur Schritte. `Space` fur Pause/Play. |
| Kontrast | Dark Mode mit hohem Kontrast (WCAG AA). |
| Schriftgrosse | Schritt-Text mindestens 1.2rem, skalierbar. |
| Reduce Motion | `prefers-reduced-motion` respektiert. Keine Animationen wenn aktiviert. |

---

> **Referenzen:**
> - `recipes_lifehub_architecture.md` — Frontend-Architektur
> - `MorphCook/SPEC.md` — MorphCook Cook Mode (Design-Referenz)
> - `recipes_dietary_profile.md` — Profile-Einstellungen fur Cook Mode