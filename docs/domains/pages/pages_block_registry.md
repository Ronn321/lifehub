# Block Registry System

## Overview
The Block Registry is the central configuration system that defines all available block types in the Pages domain. It connects block types to their rendering logic, editing components, and validation schemas.

---

## Registry Purpose

The registry ensures:

- consistent block behavior
- extensibility via new block types
- separation of logic and rendering
- safe fallback handling for unknown blocks

---

## Registry Structure

Each block type is defined as:

```ts
{
  type: "text",
  renderer: TextRenderer,
  editor: TextEditor,
  schema: TextSchema,
  validators: [],
  defaultProps: {}
}
```

---

## Core Responsibilities

- block type resolution
- renderer mapping
- editor mapping
- schema validation
- fallback handling

---

## Block Registration Flow

1. System loads registry at startup
2. Blocks are registered per module/domain
3. Registry is merged into global block map
4. Pages engine resolves blocks via type key

---

## Default Block Set

### Basic Blocks
- text
- heading
- divider
- quote
- list

### Structural Blocks
- toggle_heading
- page_link
- callout

### Media Blocks
- image
- file
- embed

### Data Blocks
- table_simple
- database_view

### Advanced Blocks
- spreadsheet
- browser_embed
- map
- search_block
- jellyfin_embed

---

## Fallback Behavior

If block type is unknown:

- render fallback UI
- show type + raw JSON
- prevent system crash

---

## Extension Model

New blocks can be added via:

- core registry extension
- plugin system (future)
- domain-specific modules

---

## Rules

- no block logic outside registry
- no implicit block behavior
- all blocks must be explicitly registered
