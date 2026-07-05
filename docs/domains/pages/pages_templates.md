# Page Templates System

## Overview
Templates define reusable page structures composed of predefined block arrangements and optional metadata presets.

---

## Template Concept

A template is a blueprint for creating pages:

- pre-defined block structure
- optional default content
- optional metadata presets
- optional permission presets

---

## Template Structure

```json
{
  "id": "uuid",
  "name": "Project Page",
  "description": "Standard project structure",
  "blocks": [
    {
      "type": "heading",
      "content": { "text": "Project Overview" }
    },
    {
      "type": "text",
      "content": { "text": "..." }
    }
  ],
  "metadata": {
    "icon": "📁",
    "default_permissions": "team"
  }
}
```

---

## Template Types

### 1. System Templates
- Built-in
- Cannot be deleted
- Used for core domains

### 2. User Templates
- Created by users
- Editable
- Shareable

### 3. Domain Templates
- Provided by domains (projects, travel, finance)

---

## Template Application

When creating a page:

1. Select template
2. Clone block structure
3. Apply metadata
4. Initialize empty blocks if needed

---

## Inheritance Rules

- Templates do not lock pages
- Pages can diverge after creation
- Template is reference-only after instantiation

---

## Future Enhancements

- Template marketplace
- AI-generated templates
- Dynamic templates based on context
