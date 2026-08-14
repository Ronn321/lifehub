# JELLYFIN FEATURE

## Goal
Integrate Jellyfin as primary media library backend with native fallback.

---

## Features

- Jellyfin API connection
- libraries, movies, series
- watch state sync (gegen Jellyfin `PlayedItems`-API — Jellyfin ist Server of Record)
- Favoriten (Jellyfin `FavoriteItems`) — für Filme/Serien UND Songs (Musik-Player)
- Benutzerdefinierte Watchlists (LifeHub-eigen: anlegen, benennen, verwalten, Filme/Serien/Folgen hinzufügen)
- Weiterschauen mit Deep-Links (Serie → Staffel/Folge vorausgewählt) + Resume-Position im Player
- native fallback for direct NAS sources

---

## Entities

- JellyfinLibrary
- JellyfinItem
- JellyfinWatchlist (name, owner, position)
- JellyfinWatchlistItem (externalItemId, itemType, name-Snapshot)

---

## API

```
GET    /jellyfin/libraries
GET    /jellyfin/items
GET    /jellyfin/items/{id}
GET    /jellyfin/servers/{serverId}/watchlists
POST   /jellyfin/servers/{serverId}/watchlists            { name }
PATCH  /jellyfin/servers/{serverId}/watchlists/{listId}   { name }
DELETE /jellyfin/servers/{serverId}/watchlists/{listId}
GET    /jellyfin/servers/{serverId}/watchlists/{listId}/items
POST   /jellyfin/servers/{serverId}/watchlists/{listId}/items    { externalItemId, itemType, name }
DELETE /jellyfin/servers/{serverId}/watchlists/{listId}/items/{externalItemId}
GET    /jellyfin/servers/{serverId}/watchlists/status/{externalItemId}
POST   /jellyfin/servers/{serverId}/items/{externalId}/toggle-watched
```
