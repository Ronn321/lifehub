# Jellyfin Embed Block

## Purpose

The Jellyfin Embed Block integrates media libraries managed by the Jellyfin Domain directly into Pages.

It allows movies, TV series, music and collections to be embedded without duplicating media management.

---

## Description

The Block communicates with the Jellyfin Domain rather than directly with the Jellyfin Server.

The Jellyfin Domain is responsible for API communication and authentication.

---

## Data Structure

```json
{
    "type": "jellyfin_embed",
    "content": {
        "library_id": "",
        "item_id": ""
    },
    "props": {
        "autoplay": false,
        "show_metadata": true
    }
}
```

---

## Supported Content

- Movies
- TV Shows
- Episodes
- Music Albums
- Songs
- Playlists
- Collections

---

## Display Modes

- Poster
- Banner
- Compact Card
- Full Player
- Playlist

---

## Playback

Playback uses the Jellyfin Player infrastructure.

Supported features include:

- play
- pause
- seek
- subtitles
- audio track selection
- playback progress

---

## Metadata

Displays:

- title
- artwork
- overview
- runtime
- genres
- release year
- progress

---

## Permissions

Access is determined by:

1. LifeHub permissions
2. Jellyfin user permissions

Both must allow access.

---

## Performance

Artwork is cached.

Metadata synchronization is performed by the Jellyfin Domain.

Streaming remains handled by Jellyfin.

---

## Accessibility

Media controls support keyboard navigation.

Poster images include descriptive alternative text.

---

## Future Extensions

- watch parties
- synchronized playback
- recommendations
- continue watching
- actor pages
- soundtrack links
- collection explorer
