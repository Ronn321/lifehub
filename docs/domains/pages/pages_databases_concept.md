# Pages Database Concept

## Overview
Databases in Pages are structured collections of Pages acting as rows with defined schemas, similar to Notion databases.

---

## Core Concept

A Database is a Page with:

- structured schema
- multiple child pages (rows)
- property definitions
- views and filters

---

## Database Structure

### Table: database_pages

| Field | Type |
|------|------|
| id | UUID |
| page_id | UUID |
| schema | JSONB |
| view_config | JSONB |

---

## Row Model

Each row is a Page:

- inherits from Pages system
- stores structured properties
- can contain blocks

---

## Properties System

Supported property types:

- text
- number
- date
- select
- multi-select
- checkbox
- relation
- file
- url

---

## Views

### 1. Table View
- spreadsheet-like layout

### 2. Board View
- kanban columns

### 3. List View
- simple vertical list

### 4. Calendar View
- date-based rendering

---

## Schema Definition

```json
{
  "properties": {
    "title": { "type": "text" },
    "status": { "type": "select" },
    "due_date": { "type": "date" }
  }
}
```

---

## Relations

- databases can reference other pages
- rows can link to other rows
- supports many-to-many relations

---

## Query Model

- filter by property
- sort by property
- group by property
- full-text search integration

---

## Constraints

- schema must be consistent per database
- property types are strict
- invalid schema changes require migration

---

## Future Enhancements

- computed properties
- rollups
- formula engine
- AI-assisted schema generation
