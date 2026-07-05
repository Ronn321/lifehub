# Text Block

## Purpose

The Text Block is the primary content element of the Pages Domain.

It represents editable rich text paragraphs.

---

## Description

A Text Block stores formatted text while remaining lightweight and easily editable.

It is expected to be the most frequently used Block.

---

## Supported Content

- plain text
- bold
- italic
- underline
- strikethrough
- inline code
- hyperlinks
- mentions
- page references
- emojis

---

## Data Structure

```json
{
    "type": "text",
    "content": {
        "text": ""
    },
    "props": {}
}
```

---

## Toolbar

Formatting options

- Bold
- Italic
- Underline
- Strikethrough
- Inline Code
- Link

---

## Slash Menu

Typing "/" while editing allows conversion into:

- Heading
- Toggle
- Quote
- List
- Todo
- Divider

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |
| Ctrl+Shift+S | Strikethrough |
| Ctrl+K | Insert Link |

---

## Rendering Rules

- Text wraps automatically.
- No horizontal scrolling.
- Supports responsive width.

---

## Paste Behavior

Supports:

- plain text
- markdown
- copied text from Office
- copied text from Notion
- copied browser text

Formatting should be preserved whenever possible.

---

## Empty State

Empty Text Blocks display a placeholder.

Example: Type '/' for commands...

---

## Validation

- Maximum length is configurable.
- No HTML is stored directly.
- Scripts are removed.

---

## Accessibility

Supports:

- keyboard editing
- screen readers
- spell checking
- IME input

---

## Future Extensions

- AI rewrite
- translation
- grammar checking
- comments
