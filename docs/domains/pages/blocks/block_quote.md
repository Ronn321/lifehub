# Quote Block

## Purpose

The Quote Block highlights quotations, notes, excerpts and important statements.

It visually separates quoted content from normal text.

---

## Description

A Quote Block may contain one or multiple paragraphs and an optional citation.

---

## Data Structure

```json
{
    "type": "quote",
    "content": {
        "text": "",
        "author": "",
        "source": ""
    }
}
```

---

## Supported Content

- rich text
- hyperlinks
- inline formatting
- page mentions

---

## Rendering

Displays:

- quote indicator
- quoted text
- optional author
- optional source

---

## User Actions

- Edit
- Duplicate
- Convert to Text
- Convert to Callout

---

## Styling

Visual appearance is defined by the global Design System.

No hardcoded colors.

---

## Validation

Quote text may be empty during editing.

Author and source are optional.

---

## Accessibility

Rendered using semantic blockquote elements.

Supports screen readers.

---

## Future Extensions

- citation management
- bibliography integration
- collapsible quotes
- highlighted excerpts
