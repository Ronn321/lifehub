# Drag & Drop Layout System

## Overview
The Drag & Drop system enables flexible reordering and structuring of blocks within a page, similar to Notion's block manipulation system.

---

## Core Concept

- Every block is draggable
- Blocks define insertion zones
- Layout is fully dynamic
- No fixed grid system required

---

## Drag Model

### Block Movement Types

- reorder within page
- move into nested block
- move across pages (future)
- duplicate via drag

---

## Drop Zones

Each block defines:

- top insertion zone
- bottom insertion zone
- inner drop zone (for nesting)

---

## Drag Data Structure

```ts
{
  blockId: string,
  sourcePageId: string,
  targetPageId?: string,
  position: number
}
```

---

## Layout Rules

- blocks maintain strict order index
- no overlapping blocks
- nesting allowed only for supported block types
- invalid drops are rejected

---

## Visual Feedback

- insertion line indicator
- highlight target block
- ghost preview during drag
- auto-scroll when near edges

---

## Reordering Strategy

1. remove block from current position
2. insert into new position
3. recalculate indices
4. persist update

---

## Nested Dragging

- supports hierarchical blocks
- indentation reflects nesting level
- collapse/expand parent blocks

---

## Constraints

- cannot drop into incompatible block types
- circular nesting prevented
- permission checks applied before drop

---

## Performance Optimization

- debounce position updates
- batch reindex operations
- minimize DOM reflows
- virtualized rendering for large pages

---

## Future Enhancements

- multi-block drag selection
- cross-page drag & drop
- timeline-based layout mode
- spatial canvas mode (optional advanced mode)
