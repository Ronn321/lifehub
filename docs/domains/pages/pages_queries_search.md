# Pages Query & Search System

## Overview
The search system provides unified access to pages, blocks, metadata, and cross-domain references.

---

## Search Scope

Search includes:

- page titles
- block content
- tags
- metadata
- relations

---

## Query Types

### 1. Full-text Search
- Search across all pages and blocks
- Indexed via search engine (e.g. Meilisearch)

### 2. Structured Filters
- by user_id
- by parent_id
- by template_id
- by domain tag

### 3. Hybrid Search
- combines text + filters + ranking

---

## API Example

GET /pages/search?q=project+cnc

Response:
```json
{
  "pages": [],
  "blocks": [],
  "score": {}
}
```

---

## Indexing Strategy

Indexed fields:

- page.title
- block.content.text
- tags
- relation labels

---

## Ranking Rules

Priority order:

1. title matches
2. direct page matches
3. block matches
4. relation matches

---

## Cross-Domain Search

Search can return:

- Media references
- Jellyfin items
- Finance entries (read-only)
- Documents

All results are normalized as "search entities"

---

## Search Optimization

- incremental indexing
- background sync
- debounce UI queries
- caching frequent queries

---

## Future Extensions

- semantic search (embedding-based)
- AI query rewriting
- voice search
- timeline search
