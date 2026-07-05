# Image Block

## Purpose

The Image Block displays one or more images stored within the Media Domain or referenced from external sources.

It is the primary visual content block of the Pages Domain.

---

## Description

Images are never stored directly inside the Block.

The Block references media managed by the Media Domain.

---

## Data Structure

```json
{
    "type": "image",
    "content": {
        "media_id": "",
        "caption": "",
        "alt": ""
    },
    "props": {
        "alignment": "center",
        "width": "auto"
    }
}
```

---

## Supported Sources

- Media Domain
- NAS storage
- uploaded files
- external URLs (optional)

---

## Supported Formats

- JPEG
- PNG
- WebP
- AVIF
- GIF
- SVG (optional)

Future:

- HEIC
- RAW previews

---

## Rendering

Supports:

- responsive scaling
- aspect ratio preservation
- lazy loading
- progressive loading

---

## Image Controls

Users may:

- resize
- align
- replace
- duplicate
- remove
- edit caption

---

## Caption

Optional caption displayed below the image.

Supports rich text formatting.

---

## Accessibility

Every image should include alternative text.

Decorative images may be marked as ignored by screen readers.

---

## Performance

- lazy loading
- thumbnail generation
- responsive image sizes
- browser caching

---

## Security

Only authenticated users may access protected media.

Media permissions are inherited from the Media Domain.

---

## Future Extensions

- image annotations
- side-by-side comparison
- galleries
- lightbox viewer
- AI-generated descriptions
- OCR integration
- EXIF display
- map integration using GPS metadata
