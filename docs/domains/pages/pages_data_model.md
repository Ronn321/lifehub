# Pages Data Model

## Core Entity: Page

Page represents a hierarchical document container.

### Table: pages

| Field | Type | Description |
|------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner |
| parent_id | UUID nullable | Parent page |
| title | string | Page title |
| icon | string | Optional icon |
| cover_url | string | Optional cover image |
| template_id | UUID nullable | Template reference |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update |

---

## Blocks Model

### Table: page_blocks

| Field | Type | Description |
|------|------|-------------|
| id | UUID | Primary key |
| page_id | UUID | Parent page |
| type | string | Block type (text, image, etc.) |
| position | int | Order in page |
| parent_block_id | UUID nullable | Nested blocks |
| content | JSONB | Block payload |
| created_at | timestamp | Creation |
| updated_at | timestamp | Update |

---

## Page Relations

Pages can reference other pages:

### Table: page_relations

| Field | Type |
|------|------|
| id | UUID |
| from_page_id | UUID |
| to_page_id | UUID |
| relation_type | string |

Examples:
- link
- embed
- reference
- database_row

---

## Templates

### Table: page_templates

| Field | Type |
|------|------|
| id | UUID |
| name | string |
| structure | JSONB |
| description | string |

---

## Permissions Model

Pages use RBAC + ownership:

- owner_id (full control)
- shared_with_users
- shared_with_roles

---

## Block Schema (Generic)

```json
{
  "id": "uuid",
  "type": "text",
  "content": {},
  "props": {},
  "position": 1
}
```

---

## Key Design Decisions

- Blocks stored as JSONB for flexibility
- Pages are lightweight metadata containers
- Hierarchy handled via parent_id
- Rendering is frontend-driven
