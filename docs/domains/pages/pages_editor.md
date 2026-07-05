# Pages Editor System

## Overview
The Pages Editor provides an interactive environment for creating and modifying Pages using a block-based editing experience.

---

## Editor Principles

- inline editing per block
- zero-modal editing (no heavy dialogs)
- instant persistence
- block-first interaction model

---

## Editor Modes

### 1. Insert Mode
- add new blocks
- choose block type
- insert at cursor position

### 2. Edit Mode
- modify block content
- live preview
- schema validation

### 3. Select Mode
- multi-block selection
- bulk actions
- copy/paste groups

---

## Block Interaction Model

Each block supports:

- click to edit
- drag handle
- duplicate
- delete
- convert type (optional)

---

## Keyboard System

- Enter → new block
- Shift+Enter → line break
- Backspace → merge/delete
- Ctrl+Z → undo
- Ctrl+Shift+Z → redo
- / → block insert menu

---

## Auto-Save System

- debounce saving (e.g. 300–800ms)
- block-level updates preferred
- conflict resolution via timestamps

---

## Cursor Model

- block-based cursor position
- supports nested blocks
- preserves selection state

---

## Validation

- schema validation per block
- invalid input highlighted
- prevents corrupt state persistence

---

## Editor State

```ts
{
  pageId: string,
  activeBlockId: string,
  selection: BlockRange,
  mode: "view" | "edit" | "select"
}
```

---

## Performance Strategy

- incremental updates per block
- avoid full-page re-render
- memoized block components
- virtualized long pages

---

## Collaboration (future)

- multi-user cursors
- real-time sync
- conflict merging
