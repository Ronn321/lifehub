# Toggle Heading Block

## Purpose

The Toggle Heading Block creates collapsible document sections.

It combines a Heading with expandable child content.

---

## Description

A Toggle Heading acts as a container.

Child Blocks are shown or hidden without being removed.

---

## Data Structure

```json
{
    "type": "toggle_heading",
    "content": {
        "text": "",
        "level": 2,
        "expanded": true
    },
    "children": []
}
```

---

## Behavior

Supports:

- expand
- collapse
- nested content
- unlimited child Blocks

---

## Default State

Configurable.

Options:

- expanded
- collapsed

---

## User Interaction

Mouse:

- click arrow
- double click heading

Keyboard:

- Enter
- Space
- Arrow Right
- Arrow Left

---

## Rendering

**Collapsed:** Heading only.

**Expanded:** Heading plus all child Blocks.

---

## Nested Content

Can contain:

- Text
- Images
- Lists
- Tables
- Other Toggle Headings

---

## State Persistence

Expanded/collapsed state is stored per user.

Other users keep their own preference.

---

## Accessibility

- Uses semantic expandable regions.
- Supports screen readers.
- Keyboard accessible.

---

## Performance

Collapsed content is not rendered until expanded when lazy rendering is enabled.

---

## Future Extensions

- expand all
- collapse all
- remember workspace state
- animated transitions
- automatic outline generation
