# Pages Block System

## Overview
The block system is the core rendering and composition engine of Pages. Every page is constructed entirely from modular blocks.

---

## Block Philosophy

- Everything is a block
- Blocks are independent modules
- Blocks are composable
- Blocks define both data + UI behavior

---

## Block Structure

```json
{
  "id": "uuid",
  "type": "text",
  "content": {},
  "props": {},
  "children": [],
  "position": 1
}
```

---

## Block Categories

### 1. Basic Blocks
- text
- heading
- divider
- quote
- list

### 2. Structural Blocks
- toggle_heading
- page_link
- callout

### 3. Media Blocks
- image
- file
- embed

### 4. Data Blocks
- table_simple
- database_view

### 5. Advanced Blocks
- spreadsheet
- browser_embed
- map
- jellyfin_embed
- search_block

---

## Block Registry

Each block is registered:

```json
{
  "type": "text",
  "renderer": "TextBlock",
  "editor": "TextEditor",
  "schema": "TextSchema"
}
```

---

## Rendering Pipeline

1. Load page
2. Fetch blocks
3. Resolve block types via registry
4. Render sequentially
5. Apply layout rules

---

## Editing Model

- Inline editing per block
- Drag & drop reorder
- Block duplication
- Nested block support (optional)

---

## Block State

Each block maintains:

- content state
- UI state
- validation state

---

## Persistence

- stored as JSONB (or relational split later)
- updated per block change
- versioned optionally

---

## Constraints

- blocks must be type-safe
- unknown block types fallback to "unsupported"
- no business logic inside pages layer

---

## Future Extensions

- plugin-based blocks
- AI-generated blocks
- realtime collaborative editing
- offline block cache
