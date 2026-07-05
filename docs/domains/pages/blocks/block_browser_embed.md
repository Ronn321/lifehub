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
        "url": "",
        "title": ""
    },
    "props": {
        "height": 700,
        "allow_navigation": true
    }
}
```

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
