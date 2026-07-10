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

## Browser Features

- Navigation
- Back
- Forward
- Reload
- Address Bar
- Zoom
- Open in external browser

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

- tab support
- split view
- bookmarks
- research history
- annotation layer
- web clipping
