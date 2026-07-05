# Simple Table Block

## Purpose

The Simple Table Block provides lightweight tabular data without calculations.

For spreadsheet functionality, use the Spreadsheet Block.

---

## Description

A Simple Table is intended for displaying structured information.

It does not support formulas or computed values.

---

## Data Structure

```json
{
    "type": "table_simple",
    "content": {
        "columns": [
            {
                "id": "uuid",
                "title": ""
            }
        ],
        "rows": [
            {
                "id": "uuid",
                "cells": [
                    ""
                ]
            }
        ]
    }
}
```

---

## Supported Features

- Create Columns
- Create Rows
- Edit Cells
- Reorder Columns
- Reorder Rows
- Delete Rows
- Delete Columns

---

## Cell Content

Each cell supports:

- plain text
- rich text
- hyperlinks
- page references

No formulas are supported.

---

## User Actions

- Insert Row
- Delete Row
- Insert Column
- Delete Column
- Resize Columns
- Copy
- Paste

---

## Clipboard Support

Supports:

- TSV
- CSV
- Excel Copy/Paste
- LibreOffice Copy/Paste

Formatting is simplified during import.

---

## Rendering

Responsive layout.

Horizontal scrolling appears when necessary.

---

## Accessibility

Rendered using semantic HTML tables.

Supports keyboard navigation between cells.

---

## Validation

All rows must contain the same number of columns.

Empty cells are permitted.

---

## Relationship to Spreadsheet Block

| Aspect | Simple Table | Spreadsheet Block |
|--------|-------------|-------------------|
| Complexity | lightweight | advanced |
| Formulas | no | yes |
| Calculations | no | yes |
| Formatting | basic | advanced |

---

## Future Extensions

- sortable columns
- filters
- row grouping
- column visibility
- sticky headers
