1|# Navigation
2|
3|Version 0.2
4|
5|---
6|
7|# Ziel
8|
9|Navigation soll jederzeit erreichbar sein.
10|
11|---
12|
13|# Sidebar-Struktur
14|
15|```
16|+---------------------------+
17||  ⬅ ➡                      |
18||                           |
19||  🏠  Home                 |
20||  🔍  Suche                |
21||                           |
22||  +--- Bibliothek ---------+
23||  | Playlists | Künstler | |
24||  | Alben     | Podcasts | |
25||  | [🔍] [Zuletzt ▾]      | |
26||  |                       | |
27||  | ❤️ Lieblingssongs      | |
28||  |    Playlist • 2.197   | |
29||  | 📑 Deine Folgen        | |
30||  | 🎵 2026 Q2             | |
31||  | 🎵 Abbey Road          | |
32||  | 🎵 This Is Alligatoah  | |
33||  | ... (scrollbar)        | |
34||  +-----------------------+
35||                           |
36||  📂 +  Neue Playlist      |
37|+---------------------------+
38|   240px expanded
39|```
40|
41|## Kollabiert (Icon-Only)
42|
43|```
44|+----+
45|| ⬅  |
46||    |
47|| 🏠 |
48|| 🔍 |
49||    |
50|| ❤️ |
51|| 📑 |
52|| 🎵 |
53|| 🎵 |
54|+----+
55| 64px
56|```
57|
58|Bei Hover im kollabierten Zustand: Tooltip mit Playlist-Name.
59|
60|---
61|
62|# Sidebar-Breiten
63|
64|| Modus | Breite | Bedingung |
65||-------|--------|-----------|
66|| Expanded | 240px | Fenster ≥ 768px (Default) |
67|| Collapsed | 64px | Fenster < 768px oder manuell umgeschaltet |
68|| Toggle | — | Hamburger-Icon oben links |
69|
70|---
71|
72|# Hauptnavigation
73|
74|Dauerhaft oben in der Sidebar.
75|
76|| Eintrag | Icon | Ziel |
77||---------|------|------|
78|| Home | Haus-Icon | Startseite |
79|| Suche | Lupe | Search-Seite |
80|
81|---
82|
83|# Bibliotheksbereich
84|
85|Unterhalb der Hauptnavigation.
86|
87|## Filter-Tabs
88|
89|Toggle-Tabs: Playlists (Default) | Künstler | Alben | Podcasts (optional).
90|
91|Aktiver Tab: Textfarbe weiß.
92|Inaktiver Tab: Textfarbe sekundär (#B3B3B3).
93|
94|## Sortierungs-Dropdown
95|
96|Default: "Zuletzt" (kürzlich verwendete zuerst).
97|
98|Optionen:
99|
100|- Zuletzt
101|- Alphabetisch
102|- Kürzlich gespielt
103|- Zuletzt erstellt
104|
105|## Suche innerhalb der Sidebar
106|
107|Kleinenes Suchfeld (🔍) filtert die Playlist-Liste live.
108|
109|---
110|
111|# Bibliotheksliste
112|
113|Jeder Eintrag zeigt:
114|
115|- Icon/Cover (32x32 px, quadratisch)
116|- Titel (14px, weiß)
117|- Typ und Metainfo (12px, sekundär)
118|- Kontextindikator (grüner Haken bei heruntergeladenen)
119|
120|Beispiel: `❤️ Lieblingssongs — Playlist • 2.197 Songs`
121|
122|## Eintragstypen
123|
124|| Typ | Icon-Style | Metainfo |
125||------|-----------|----------|
126|| Playlist | Herz / Cover | `Playlist • n Songs` |
127|| Album | Cover | `Album • Künstler` |
128|| Künstler | Foto | `Künstler` |
129|| Ordner | Ordner-Icon | `Ordner • n Elemente` |
130|| Sammlung | Tag-Icon | `Sammlung • n Songs` |
131|
132|---
133|
134|# Pinned Bereiche
135|
136|Angeheftete Elemente erscheinen oben in der Liste.
137|
138|Standard-Pins:
139|
140|- Lieblingssongs (Favoriten)
141|- Downloads
142|- Zuletzt gehört
143|- Eigene Sammlungen
144|
145|User kann jeden Eintrag anpinnen (Kontextmenü → Anheften).
146|
147|---
148|
149|# Custom Reihenfolge
150|
151|Playlists können per Drag & Drop umsortiert werden.
152|
153|- Drag-Handle: gesamte Zeile
154|- Ghost-Element beim Ziehen
155|- Einfüge-Marker an Zielposition
156|- Reihenfolge wird in LifeHub-DB gespeichert (nicht in Jellyfin)
157|
158|---
159|
160|# Bibliotheksaktionen
161|
162|Oben im Bibliotheksbereich.
163|
164|| Aktion | Icon | Ergebnis |
165||--------|------|----------|
166|| Neue Playlist | + | Öffnet Dialog zum Erstellen |
167|| Neuer Ordner | 📂+ | Erstellt Ordner in Sidebar |
168|| Importieren | ⬆ | M3U/JSON Import-Dialog |
169|| Sortieren | ▾ | Öffnet Sortierungs-Dropdown |
170|| Filtern | 🔍 | Öffnet Sidebar-Suche |
171|
172|---
173|
174|# Navigation History
175|
176|In der Top Bar.
177|
178|| Button | Aktion |
179||--------|--------|
180|| ⬅ Zurück | Vorherige Seite (Browser-Back) |
181|| ➡ Vor | Nächste Seite (Browser-Forward) |
182|
183|History wird als Stack verwaltet.
184|
185|Chronik-Menü (optional): zeigt letzte 10 besuchte Seiten.
186|
187|---
188|
189|# Suchleiste
190|
191|Permanent in der Top Bar.
192|
193|→ siehe spotify_search.md für Details.
194|
195|---
196|
197|# Benutzerbereich
198|
199|Oben rechts in der Top Bar.
200|
201|| Element | Funktion |
202||---------|----------|
203|| Profil-Avatar | Öffnet User-Menu |
204|| User-Menu | Einstellungen, Profil, Abmelden |
205|| Notification-Bell | Zeigt Benachrichtigungen |
206|| Window-Controls | Minimieren, Maximieren, Schließen |
207|
208|---
209|
210|# Hover States
211|
212|| Element | Hover-Verhalten |
213||---------|-----------------|
214|| Sidebar-Item | Hintergrund → #1A1A1A |
215|| Aktives Sidebar-Item | Hintergrund → #282828, Text weiß |
216|| Tab | Textfarbe → weiß |
217|| Button | Farbe → heller |
218|| Link | Unterstrich oder Farbe → Akzent |
219|
220|Hover-Verzögerung: 0 ms (instant).
221|
222|---
223|
224|# Selection States
225|
226|Aktive Elemente werden deutlich markiert.
227|
228|| Element | Aktiv-Indikator |
229||---------|-----------------|
230|| Sidebar-Item | Hintergrund #282828, Text weiß |
231|| Aktive Seite (Home/Suche) | Text weiß, Icon weiß |
232|| Aktiver Tab | Text weiß, Bottom-Border Akzent |
233|| Playlist spielt gerade | Grüner Text, Soundbar-Icon |
234|
235|---
236|
237|# Collapse Animation
238|
239|Sidebar einklappen: Breite 240px → 64px.
240|
241|- Dauer: 250 ms
242|- Easing: ease-in-out (cubic-bezier(0.4, 0, 0.2, 1))
243|- Text-Labels: Fade-Out 100 ms vor Breiten-Animation
244|- Icons: bleiben sichtbar, leicht skaliert
245|
246|---
247|
248|# Kontextmenüs
249|
250|Alle Navigationselemente besitzen Kontextmenüs (Rechtsklick).
251|
252|## Playlist-Kontextmenü
253|
254|- Abspielen
255|- Zufallswiedergabe
256|- Zur Queue hinzufügen
257|- Umbenennen
258|- Bearbeiten
259|- Teilen
260|- Herunterladen
261|- Duplizieren
262|- Zu Ordner verschieben
263|- Anheften / Loslösen
264|- Löschen
265|
266|## Ordner-Kontextmenü
267|
268|- Umbenennen
269|- Duplizieren
270|- Exportieren
271|- Löschen
272|
273|---
274|
275|# Drag & Drop
276|
277|| Quelle | Ziel | Ergebnis |
278||--------|------|----------|
279|| Song (aus Liste) | Playlist-Icon in Sidebar | Song zu Playlist hinzufügen |
280|| Song (aus Liste) | Queue in Now Playing | Song zur Queue hinzufügen |
281|| Playlist | Position in Liste | Playlist umsortieren |
282|| Playlist | Ordner | Playlist in Ordner verschieben |
283|| Album | Playlist-Icon | Alle Album-Songs zur Playlist |
284|
285|Drag-Threshold: 5 px bevor Drag startet.
286|
287|Ghost-Element erscheint nach 50 ms.
288|
289|---
290|
291|# Keyboard-Navigation
292|
293|| Taste | Aktion |
294||-------|--------|
295|| Pfeil oben/unten | Durch Sidebar-Liste navigieren |
296|| Enter | Ausgewählte Playlist öffnen |
297|| Kontextmenü-Taste | Kontextmenü öffnen |
298|| Strg+N | Neue Playlist erstellen |
299|| Esc | Auswahl aufheben / Menü schließen |
300|
301|---
302|
303|# Workspace Integration
304|
305|Die Music Domain ist eine Domain innerhalb von LifeHub.
306|
307|Integration erfolgt über:
308|
309|- Globale Top-Bar von LifeHub (Domänen-Switcher)
310|- Music Domain hat eigene Sidebar und Player-Bar
311|- Player bleibt aktiv auch beim Wechsel zu anderen LifeHub-Domains
312|- Musik spielt im Hintergrund weiter
313|
314|---
315|
316|# Zukünftige Erweiterungen
317|
318|Dieses Dokument wird später detailliert beschreiben
319|
320|- Custom-Sortierung mit Drag-Presets
321|- Mehrere Sidebar-Filter gleichzeitig
322|- Dynamic Folders (Smart-Ordner)
323|- Lebenslauf-Navigation (visuelle History)
324|- Kontextsensitive Vorschläge
325|
---

# Sidebar Zustände
Expanded (alle Inhalte), Compact (nur Icons), Hidden (zukünftig)

---

# Sidebar Bereiche
Logo, Navigation, Bibliothek, Playlists, Angepinnte Inhalte, Footer

---

# Hauptnavigation
Home, Search, Library, Downloads, Collections, History

---

# Bibliotheksnavigation
Playlists, Alben, Künstler, Genres, Komponisten, Ordner, Favoriten

---

# Navigation States
Default, Hover, Focused, Selected, Disabled, Loading

---

# Header Navigation
Vor/Zurück, Suchfeld, Aktuelle Seite, Globale Aktionen, Benutzerprofil

---

# Navigation Regeln
Nur Main Content wird ersetzt. Playback bleibt aktiv. Queue bleibt erhalten. Suchzustand bleibt erhalten.

---

# Auswahlverhalten
Ein Klick: Öffnen. Doppelklick: Direkt abspielen. Rechtsklick: Kontextmenü.

---

# Breadcrumbs (vorgesehen)
Home > Playlist > Album > Song

---

# Drag & Drop Navigation
Songs, Playlists, Ordner, Sammlungen

---

# Kontextmenüs
Bearbeiten, Umbenennen, Löschen, Anheften, Sortieren

---

# Tastatur
Tab, Pfeiltasten, Enter, Escape, Ctrl+Kombinationen

---

# Navigation Performance
Kein Seitenreload. Scrollposition bleibt erhalten. Player unverändert.

---

# Erweiterung später
Tastaturmatrix, Fokusreihenfolge, Animationen, Sidebar Transitionen, Touchpad, History Management
