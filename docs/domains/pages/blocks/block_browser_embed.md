# Browser Embed Block

## Purpose

The Browser Embed Block provides an integrated web browser for research and reference directly inside a Page.

It is intended for project research, documentation and pinned web applications.

---

## Description

The browser operates in an isolated sandbox and does not have access to the internal LifeHub application.

Users may pin useful websites directly into Pages.

---

## Data Structure

```json
{
    "type": "browser_embed",
    "content": {
        "startUrl": "",
        "title": "",
        "sessionId": null
    },
    "layout": {
        "height": 600,
        "minHeight": 300,
        "resizable": true
    }
}
```

> **`sessionId`** wird beim ersten Render automatisch erstellt via `POST /api/v1/browser/:blockId/session` und im Block-Content gespeichert. Jeder BrowserBlock hat genau eine Session mit isolierten Tabs, History, Cookies, Bookmarks und Settings.

> Vollständige Architektur: `docs/01_Architecture/BROWSER_BLOCK_ARCHITECTURE.md`

---

## Supported Use Cases

- Project research
- Thingiverse browsing
- Printables browsing
- GitHub repositories
- Documentation
- Raspberry Pi projects
- Arduino documentation
- Online calculators

---

## Browser Features (implemented 2026-07-15)

- ✅ Navigation (Back, Forward, Reload)
- ✅ Address Bar (URL-Eingabe + Enter)
- ✅ Tab Support (hinzufügen, schließen, aktivieren)
- ✅ Open in external browser
- ✅ Session-Isolation (eigene Tabs pro Block)
- ✅ Auto-Init Session (via API)
- ⬜ Zoom (Settings)
- ⬜ Bookmarks (API bereit, UI pending)

---

## Security

Runs inside a sandbox.

Restrictions:

- no application DOM access
- no credential sharing
- configurable permissions
- isolated storage

---

## Rendering

Uses an embedded browser component.

Fallback to external browser if embedding is not supported.

---

## Performance

Inactive browser instances may be suspended.

Session state can optionally be preserved.

---

## Accessibility

Keyboard navigation is fully supported.

Focus remains isolated within the browser.

---

## Future Extensions

- ✅ ~~tab support~~ **implemented**
- split view
- bookmarks (API backend bereit)
- research history (API backend bereit)
- annotation layer
- web clipping
