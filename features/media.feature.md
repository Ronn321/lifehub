# MEDIA FEATURE

## Goal
Unified media system for photos, videos, albums and NAS integration.

---

## Features

- upload media
- NAS folder indexing
- albums
- tagging
- timeline view
- map view
- globe view

---

## Entities

- MediaFile
- Album
- Tag
- MediaSource

---

## Screens

- Gallery
- Album view
- Timeline
- Map view
- Globe view

---

## API

```
POST   /media/upload
GET    /media
GET    /media/{id}
POST   /albums
POST   /albums/{id}/items
```

---

## Rules

- EXIF extracted automatically
- GPS used for map positioning
- thumbnails generated on upload

---

## Integrations

- NAS filesystem
- FFmpeg
- ExifTool
