# JELLYFIN FEATURE

## Goal
Integrate Jellyfin as primary media library backend with native fallback.

---

## Features

- Jellyfin API connection
- libraries, movies, series
- watch state sync
- native fallback for direct NAS sources

---

## Entities

- JellyfinLibrary
- JellyfinItem

---

## API

```
GET    /jellyfin/libraries
GET    /jellyfin/items
GET    /jellyfin/items/{id}
```
