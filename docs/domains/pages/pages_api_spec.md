# Pages API Specification

## Base URL
/api/v1/pages

---

## Pages

### Create Page
POST /pages

Request:
```json
{
  "title": "My Page",
  "parent_id": null,
  "template_id": null
}
```

Response:
```json
{
  "id": "uuid",
  "title": "My Page"
}
```

### Get Page
GET /pages/{id}

Response includes:
- page metadata
- blocks
- relations

### Update Page
PUT /pages/{id}

Request:
```json
{
  "title": "Updated Title",
  "icon": "📄"
}
```

### Delete Page
DELETE /pages/{id}

Soft delete only.

---

## Blocks

### Add Block
POST /pages/{id}/blocks

```json
{
  "type": "text",
  "content": {
    "text": "Hello world"
  },
  "position": 3
}
```

### Update Block
PUT /blocks/{block_id}

### Delete Block
DELETE /blocks/{block_id}

### Reorder Blocks
POST /pages/{id}/blocks/reorder

```json
{
  "order": ["block1", "block2", "block3"]
}
```

---

## Page Tree

### Get Subpages
GET /pages/{id}/children

### Move Page
POST /pages/{id}/move

```json
{
  "new_parent_id": "uuid"
}
```

---

## Templates

GET /page-templates
POST /page-templates

---

## Search Integration

GET /pages/search?q=

Returns:
- pages
- blocks
- references

---

## Browser & Research (implemented, not yet spec'd)

### Research Sessions
```
POST   /pages/:id/research-sessions
GET    /pages/:id/research-sessions
PUT    /pages/research-sessions/:sessionId
DELETE /pages/research-sessions/:sessionId
```

### Research Sources
```
POST   /pages/research-sessions/:sessionId/sources
GET    /pages/research-sessions/:sessionId/sources
DELETE /pages/research-sources/:sourceId
PUT    /pages/research-sources/:sourceId/pin
```

### Browser Tabs (current — bound to research sessions)
```
GET    /pages/research-sessions/:sessionId/tabs
POST   /pages/research-sessions/:sessionId/tabs
PUT    /pages/browser-tabs/:tabId
DELETE /pages/browser-tabs/:tabId
POST   /pages/research-sessions/:sessionId/tabs/:tabId/activate
```

### Browser Proxy & Rendering (⚠️ currently without auth guards)
```
GET    /browser/proxy?url=xxx        (Chrome/Puppeteer render)
POST   /browser/proxy?url=xxx
GET    /browser/screenshot?url=xxx
GET    /proxy?url=xxx                (direct fetch, no Chrome)
POST   /proxy?url=xxx
```

> **Note:** These endpoints exist in code but are not yet documented as
> production-ready. See `BROWSER_BLOCK_ARCHITECTURE.md` for the target API spec
> and `docs/reviews/browser_block_review.md` for the full review.
> The proxy/browser endpoints currently LACK authentication — see Review §K-01.

---

## Notes
- All endpoints require authentication
- All modifications are audited
- ⚠️ Browser/Proxy endpoints currently lack auth (see Review)
- All responses include permission metadata
