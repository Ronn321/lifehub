# Database View Block

## Purpose

The Database View Block displays and interacts with structured data stored in the Pages Database System.

Unlike the Simple Table Block, this Block visualizes existing database content rather than storing its own data.

---

## Description

A Database View references a Database Page and renders one of its available views.

All edits are performed directly on the underlying database.

---

## Data Structure

```json
{
    "type": "database_view",
    "content": {
        "database_page_id": "",
        "view_id": ""
    },
    "props": {
        "editable": true
    }
}
```

---

## Supported Views

- Table
- Board (Kanban)
- List
- Calendar

Future:

- Timeline
- Gallery
- Map
- Gantt
- Chart

---

## Data Source

Data is retrieved dynamically from:

- Database Pages
- Database Rows
- Property Definitions

The Block stores only references.

---

## User Actions

- Create Row
- Edit Row
- Delete Row
- Sort
- Filter
- Group
- Change View
- Resize Columns

---

## Rendering

The active view determines the layout.

Changes update the database immediately.

---

## Permissions

View permissions inherit from the referenced database.

Read-only mode is supported.

---

## Performance

Supports:

- pagination
- lazy loading
- virtual scrolling
- incremental updates

---

## Accessibility

All views must remain keyboard accessible.

Tables use semantic HTML where appropriate.

---

## Future Extensions

- formulas
- rollups
- AI queries
- dashboards
- linked databases
