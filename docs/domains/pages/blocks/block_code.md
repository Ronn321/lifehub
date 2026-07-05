# Code Block

## Purpose

The Code Block stores and displays source code with syntax highlighting.

It is intended for software development, configuration files, scripts and technical documentation.

---

## Description

The Code Block preserves formatting exactly as entered.

No automatic formatting is applied unless explicitly requested.

---

## Data Structure

```json
{
    "type": "code",
    "content": {
        "language": "plaintext",
        "code": ""
    },
    "props": {
        "line_numbers": true,
        "word_wrap": false
    }
}
```

---

## Supported Languages

Examples:

- Plain Text
- Python
- TypeScript
- JavaScript
- Java
- C#
- C++
- Rust
- Go
- HTML
- CSS
- SQL
- JSON
- YAML
- XML
- Bash
- PowerShell
- Dockerfile
- Markdown

Additional languages depend on the syntax highlighting engine.

---

## Rendering

Supports:

- syntax highlighting
- optional line numbers
- horizontal scrolling
- optional word wrap

---

## User Actions

- Copy Code
- Download
- Change Language
- Toggle Line Numbers
- Toggle Word Wrap

---

## Editing

Code is edited in a monospace editor.

Indentation is preserved.

Tab behavior is configurable.

---

## Validation

No language-specific validation is required.

Code is stored exactly as entered.

---

## Security

Code is never executed.

Scripts remain inert.

HTML is rendered as text.

---

## Accessibility

Supports keyboard navigation.

High contrast themes are available through the Design System.

---

## Future Extensions

- Monaco Editor integration
- execution sandbox
- diff viewer
- Git integration
- AI code explanation
- AI code generation
