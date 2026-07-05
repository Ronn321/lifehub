# Heading Block

## Purpose

The Heading Block creates hierarchical document structure.

---

## Supported Levels

- Heading 1
- Heading 2
- Heading 3

Future:

- Heading 4
- Heading 5
- Heading 6

---

## Data Structure

```json
{
    "type": "heading",
    "content": {
        "text": "",
        "level": 1
    }
}
```

---

## Behavior

Creates sections inside a Page.

Used for:

- navigation
- hierarchy
- automatic table of contents

---

## Table of Contents

Every Heading automatically registers itself.

The Rendering Engine generates navigation.

---

## Styling

Typography is defined globally.

Heading size depends only on level.

---

## Editing

Editable inline.

Heading level can be changed from toolbar.

---

## Keyboard

Markdown shortcuts supported.

Examples:

- # Heading 1
- ## Heading 2
- ### Heading 3

---

## Validation

- Heading level must be valid.
- Empty headings are allowed while editing.

---

## Accessibility

- Headings produce semantic HTML.
- Correct heading order should be encouraged.

---

## Future Extensions

- collapsible sections
- automatic numbering
- anchor links
