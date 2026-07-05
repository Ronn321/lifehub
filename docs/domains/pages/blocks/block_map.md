# Map Block

## Purpose

The Map Block displays interactive maps using open technologies without requiring commercial API keys.

It supports travel planning, location management and geospatial visualization.

---

## Description

The Map Block is built around OpenStreetMap-compatible technologies.

It is capable of displaying markers, routes and overlays.

---

## Data Structure

```json
{
    "type": "map",
    "content": {
        "center": {
            "latitude": 0,
            "longitude": 0
        },
        "zoom": 5
    },
    "props": {
        "provider": "OpenStreetMap"
    }
}
```

---

## Supported Providers

Default

- OpenStreetMap

Rendering

- Leaflet

Future

- Offline Tile Server
- Vector Tiles
- Custom Tile Sources

---

## Supported Features

- Pan
- Zoom
- Markers
- Polylines
- Polygons
- Popups

---

## Travel Integration

Supports:

- vacation pages
- photo locations
- GPX tracks
- visited places
- route planning

---

## Media Integration

Images with GPS metadata may automatically generate markers.

---

## Offline Support

Future support includes:

- local tile cache
- offline tile server
- NAS-hosted map tiles

---

## Performance

- lazy loading
- tile caching
- viewport rendering

---

## Accessibility

Keyboard navigation supported.

Map controls remain screen reader accessible where possible.

---

## Future Extensions

- 3D terrain
- globe mode
- heatmaps
- clustering
- live tracking
- weather overlays
