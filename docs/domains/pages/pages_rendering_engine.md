# Pages Rendering Engine

## Overview
The rendering engine is responsible for transforming page data and blocks into a structured UI output.

---

## Rendering Pipeline

### Step 1: Load Page
- fetch page metadata
- fetch blocks by page_id
- resolve permissions

### Step 2: Block Resolution
- map block.type → registry entry
- attach renderer + schema
- validate block content

### Step 3: Layout Construction
- order blocks by position
- resolve nested blocks
- apply layout constraints

### Step 4: Render Phase
- execute renderer per block
- build UI tree
- apply styling system

---

## Rendering Modes

### 1. View Mode
- read-only
- optimized rendering
- no editing UI

### 2. Edit Mode
- inline editing enabled
- drag & drop active
- block controls visible

### 3. Focus Mode
- single block focus
- distraction-free view

---

## Rendering Model

```text
Page
  ↓
Blocks[]
  ↓
BlockRegistry.resolve(type)
  ↓
Renderer(component)
  ↓
UI Tree
```

---

## Nested Rendering

Blocks may contain children:

- recursive rendering allowed
- depth limited for performance
- lazy loading optional

---

## Performance Strategy

- virtualized rendering for long pages
- lazy block hydration
- memoized block components
- diff-based updates

---

## Error Handling

- invalid block → fallback renderer
- missing schema → safe render
- render crash → isolate block only

---

## Future Enhancements

- server-side rendering (SSR)
- streaming render pipeline
- AI-assisted layout optimization
