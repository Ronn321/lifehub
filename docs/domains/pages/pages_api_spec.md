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

## Notes
- All endpoints require authentication
- All modifications are audited
- All responses include permission metadata
