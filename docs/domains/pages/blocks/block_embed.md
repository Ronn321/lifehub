# Embed Block

## Purpose

The Embed Block allows external web content to be displayed directly inside a Page.

It provides a unified mechanism for embedding supported services and websites.

---

## Description

Embeds are isolated from the main application and rendered securely.

The Block stores only the source URL and metadata.

---

## Data Structure

```json
{
    "type": "embed",
    "content": {
        "url": "",
        "provider": ""
    },
    "props": {
        "height": 600,
        "interactive": true
    }
}
```

---

## Supported Providers

### Video
- YouTube
- Vimeo

### Maps
- OpenStreetMap
- Leaflet Views

### Media
- Jellyfin

### Documents
- PDF

### General
- Any embeddable website

---

## Rendering

Supported rendering methods:

- iframe
- native renderer
- provider-specific component

---

## Security

Embeds execute inside a sandbox.

Restrictions:

- no DOM access
- no application context access
- no cookies shared with LifeHub
- configurable Content Security Policy

---

## User Actions

- Open externally
- Reload
- Resize
- Replace URL
- Remove

---

## Validation

URL validation is performed before rendering.

Unsupported providers display a fallback.

---

## Performance

- lazy loading
- deferred initialization
- viewport activation

---

## Accessibility

Embeds include descriptive titles.

Keyboard focus remains accessible.

---

## Future Extensions

- custom providers
- authenticated embeds
- interactive dashboards
- live websites
