# Pages Relations & Linking System

## Overview
The Relations & Links system defines how Pages connect to each other and to external entities across the LifeHub ecosystem.

---

## Core Concept

Pages are not isolated documents. They form a graph structure via:

- direct links
- references
- embedded relations
- database relations
- external system bindings

---

## Relation Types

### 1. Page-to-Page Links
- simple references between pages
- used for navigation and context

### 2. Block-Based Links
- block_page_link
- inline references inside content

### 3. Database Relations
- relational fields between page-based database rows
- many-to-one and many-to-many

### 4. External Relations
- links to:
  - Media domain (files, images)
  - Jellyfin (movies, series)
  - Finance (read-only references)
  - Documents (attachments)

---

## Data Model

```ts
{
  id: string,
  from_page_id: string,
  to_page_id?: string,
  from_block_id?: string,
  relation_type: "link" | "embed" | "reference" | "database",
  metadata: Record<string, any>
}
```

---

## Backlinks System

- automatically generated reverse relations
- used for navigation
- indexed for search

---

## Graph Structure

Pages form a directed graph:

- hierarchical tree (primary)
- cross-links (secondary graph layer)

---

## Rules

- no circular dependencies in parent-child hierarchy
- relations do not affect ownership
- permissions are inherited from source page

---

## Use Cases

- project linking to documentation
- travel page linking to media albums
- finance page linking to documents
- IT inventory linking to devices

---

## Future Extensions

- visual graph view
- relation analytics
- AI-driven link suggestions
