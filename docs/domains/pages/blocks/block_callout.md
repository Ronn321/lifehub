# Callout Block

## Purpose

The Callout Block highlights important information.

It is used for notes, warnings, tips, references and contextual information.

---

## Description

A Callout contains an icon and rich text content.

It visually separates important content from surrounding blocks.

---

## Data Structure

```json
{
    "type": "callout",
    "content": {
        "icon": "💡",
        "text": ""
    },
    "props": {
        "style": "default"
    }
}
```

---

## Supported Styles

- Default
- Information
- Success
- Warning
- Error
- Question

---

## Supported Content

- rich text
- hyperlinks
- inline code
- page references

Future:

- nested blocks

---

## User Actions

- Change Icon
- Change Style
- Edit Content
- Duplicate
- Delete

---

## Rendering

Displays:

- icon
- highlighted container
- formatted text

Appearance follows the global Design System.

---

## Accessibility

Icons always have textual meaning.

Color alone must never communicate importance.

---

## Validation

Text may be empty during editing.

Invalid styles fall back to Default.

---

## Future Extensions

- collapsible callouts
- custom colors
- embedded media
- AI-generated summaries
