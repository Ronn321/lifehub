# List Block

## Purpose

The List Block represents ordered, unordered and nested lists.

It is designed for structured information, notes, instructions and hierarchical content.

---

## Description

The List Block contains one or more list items.

Each item may contain rich text and optionally nested child items.

---

## Data Structure

```json
{
    "type": "list",
    "content": {
        "style": "bullet",
        "items": [
            {
                "id": "uuid",
                "text": "",
                "children": []
            }
        ]
    }
}
```

---

## Supported List Types

- Bullet List
- Numbered List
- Alphabetical List
- Roman Numeral List

Future:

- Definition List
- Checklist View
- Timeline List

---

## Nested Lists

Unlimited nesting is supported.

Child indentation is managed automatically.

---

## Rich Text Support

Each list item supports:

- bold
- italic
- underline
- inline code
- hyperlinks
- mentions
- page links

---

## User Actions

- Add Item
- Delete Item
- Indent
- Outdent
- Move Up
- Move Down
- Convert List Type

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter | Create new item |
| Tab | Indent item |
| Shift + Tab | Outdent item |
| Backspace | Merge with previous item when empty |

---

## Rendering

Lists use semantic HTML elements.

Spacing is controlled by the global Design System.

---

## Accessibility

Supports:

- keyboard navigation
- screen readers
- semantic list structure

---

## Validation

Empty lists are allowed while editing.

Item IDs must remain unique.

---

## Future Extensions

- collapsible lists
- sortable lists
- AI-generated outlines
