# Search Block

## Purpose

The Search Block provides contextual search capabilities inside Pages.

It enables users to search across Pages, Blocks, Media, Databases and external integrations from within a single embedded interface.

---

## Description

The Search Block acts as a scoped search engine.

It can be restricted to a Page, a Domain or expanded globally across LifeHub.

---

## Data Structure

```json
{
    "type": "search",
    "content": {
        "query": "",
        "scope": "global"
    },
    "props": {
        "live_search": true,
        "show_filters": true
    }
}
```

---

## Search Scopes

### 1. Page Scope
- searches within current page only

### 2. Domain Scope
- pages domain
- media domain
- finance domain (read-only)

### 3. Global Scope
- entire LifeHub system

---

## Search Targets

- Pages
- Blocks
- Titles
- Content
- Tags
- Media metadata
- Database entries
- External links (indexed)

---

## Query System

Supports:

- full-text search
- fuzzy matching
- prefix search
- tag filtering
- structured filters

---

## Filtering

- by type (page, block, media)
- by domain
- by date
- by author
- by template

---

## Ranking Strategy

1. title matches
2. exact matches
3. partial content matches
4. metadata matches
5. relevance scoring

---

## Live Search

- debounced input
- incremental results
- streaming updates (future)

---

## Rendering

Displays:

- search input field
- result list
- preview panel (optional)
- filter sidebar

---

## Performance

- indexed search backend (Meilisearch or similar)
- cached queries
- incremental indexing

---

## Security

Search results are permission filtered.

No unauthorized content is returned.

---

## Accessibility

Fully keyboard navigable.

Screen reader friendly result list.

---

## Future Extensions

- semantic search (vector embeddings)
- AI query rewriting
- voice search
- cross-device search sync
- conversational search interface
