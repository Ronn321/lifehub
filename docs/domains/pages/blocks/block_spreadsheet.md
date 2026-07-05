# Spreadsheet Block

## Purpose

The Spreadsheet Block provides a fully functional calculation grid similar to Excel or Google Sheets.

It is significantly more advanced than the Simple Table Block and supports formulas, functions and computed values.

---

## Description

A Spreadsheet is a grid-based data structure where each cell can contain:

- raw values
- formulas
- references to other cells
- references to other blocks or pages (future)

It is designed for structured calculations and financial, technical or analytical use cases.

---

## Data Structure

```json
{
    "type": "spreadsheet",
    "content": {
        "columns": [
            { "id": "A", "title": "A" },
            { "id": "B", "title": "B" }
        ],
        "rows": [
            {
                "id": "1",
                "cells": {
                    "A": "10",
                    "B": "=A1*2"
                }
            }
        ]
    },
    "props": {
        "formula_enabled": true,
        "auto_recalculate": true
    }
}
```

---

## Formula System

### Supported Formula Types

- Arithmetic: `+ - * /`
- Cell references: `A1`, `B2`
- Ranges: `SUM(A1:A10)`
- Aggregations: `SUM`, `AVG`, `MIN`, `MAX`
- Logical: `IF`, `AND`, `OR`

---

## Execution Model

1. Parse formulas
2. Build dependency graph
3. Evaluate cells in topological order
4. Recalculate on change

---

## Recalculation Strategy

- incremental recalculation
- dependency tracking per cell
- lazy evaluation for large sheets

---

## Editing Model

- cell-based editing
- formula bar support
- keyboard navigation like Excel

---

## Keyboard Shortcuts

- Arrow keys → navigate cells
- Enter → edit cell
- Tab → next cell
- Shift+Enter → new line in cell
- Ctrl+Z → undo
- Ctrl+Y → redo

---

## Rendering

- virtualized grid rendering
- sticky headers
- resizable columns
- row/column indexing

---

## Performance Considerations

- large grid virtualization
- memoized formula evaluation
- batching updates
- background recalculation worker

---

## Data Integrity

- formula validation
- circular dependency detection
- type coercion rules

---

## Permissions

Inherited from Page system.

Cell-level permissions may be introduced later.

---

## Use Cases

- finance tracking
- budgeting
- engineering calculations
- IoT data analysis
- project metrics
- inventory calculations

---

## Future Extensions

- Python-like scripting
- AI-assisted formula generation
- external data sources
- real-time collaboration
- charts and visualizations
