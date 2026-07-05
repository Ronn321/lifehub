# Blocks Base Concepts

## Overview

Blocks are the fundamental building units of every Page in the Pages Domain.

Everything visible inside a Page is represented by one or more Blocks.

Pages themselves contain no presentation logic. They are ordered collections of Blocks.

---

## Core Principles

- Everything is a Block.
- Every Block is an independent module.
- Blocks are reusable.
- Blocks are self-contained.
- Blocks define their own schema.
- Blocks define their own renderer.
- Blocks define their own editor.
- Blocks may define their own toolbar.
- Blocks may define their own settings panel.
- Blocks are versioned independently.

---

## Block Lifecycle

Every Block follows the same lifecycle.

1. Created
2. Initialized
3. Rendered
4. Edited
5. Saved
6. Versioned
7. Deleted (soft delete)

---

## Block Definition

Every Block consists of:

- Metadata
- Content
- Properties
- State
- Renderer
- Editor
- Validation Schema

---

## Generic Block Structure

```json
{
    "id": "uuid",
    "type": "text",
    "content": {},
    "props": {},
    "children": [],
    "metadata": {},
    "created_at": "",
    "updated_at": ""
}
```

---

## Required Metadata

Every Block must contain:

- id
- type
- created_at
- updated_at

Optional:

- created_by
- updated_by
- version
- plugin_source

---

## Block Categories

### Basic Blocks

General document editing.

Examples

- Text
- Heading
- Divider
- Quote
- List

---

### Structure Blocks

Document organization.

Examples

- Toggle
- Callout
- Page Link

---

### Media Blocks

Media presentation.

Examples

- Image
- Gallery
- Video
- Audio
- File

---

### Data Blocks

Structured information.

Examples

- Simple Table
- Database View
- Spreadsheet

---

### Integration Blocks

External systems.

Examples

- Browser
- Jellyfin
- Maps
- Search

---

## Rendering Rules

Blocks render independently.

A Block never renders another Block directly.

Nested Blocks are rendered recursively by the Rendering Engine.

---

## Editing Rules

Each Block owns its editing experience.

The Pages Editor only provides:

- selection
- drag & drop
- clipboard
- history
- keyboard shortcuts

---

## Validation Rules

Every Block defines its own schema.

Invalid data must never crash the editor.

Unknown properties are ignored.

---

## Persistence Rules

Every Block is saved independently.

Small edits should never require saving the entire Page.

---

## Styling Rules

Blocks define structure.

Global Design System defines appearance.

Blocks must never contain hardcoded colors or theme values.

---

## Accessibility

Every Block must support:

- keyboard navigation
- screen readers
- focus indicators
- responsive layouts

---

## Plugin Compatibility

Every future plugin Block must implement exactly the same interface as built-in Blocks.

There are no privileged Block types.

---

## Future Extensions

Future Block capabilities may include:

- AI generation
- collaboration
- scripting
- automation
- custom events
