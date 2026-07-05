# Pages Navigation System

## Overview
The navigation system defines how users traverse the Pages hierarchy, including tree structures, backlinks, breadcrumbs, and global search-driven navigation.

---

## Navigation Model

Pages are organized as a directed tree:

- Each page has `parent_id`
- Multiple levels of nesting are allowed
- Pages can also be referenced outside hierarchy via links

---

## Core Navigation Types

### 1. Tree Navigation
- Sidebar-based hierarchical tree
- Lazy loading for deep structures
- Expand/collapse nodes

### 2. Breadcrumb Navigation
- Derived from parent chain
- Format: Root → Parent → Current Page

### 3. Backlinks
- Pages referencing current page via:
  - block_page_link
  - relations
  - embeds

### 4. Quick Switcher
- Global search navigation
- Cmd/Ctrl + K behavior
- Fuzzy search across:
  - page titles
  - blocks
  - tags

---

## Navigation Data Model

Derived, not stored:

- breadcrumbs = recursive parent lookup
- children = query by parent_id
- backlinks = relation index table

---

## Navigation Rules

- Pages can exist without parent (root pages)
- Circular references are forbidden
- Deleted pages removed from navigation tree
- Permissions filter visible nodes

---

## Performance Strategy

- Tree is not fully loaded at once
- Use pagination per subtree level
- Cache frequently accessed nodes

---

## Future Extensions

- Graph view (network mode)
- Map-based navigation (geo pages)
- Timeline navigation (time-based pages)
