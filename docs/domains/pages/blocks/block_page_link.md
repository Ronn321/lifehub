# Page Link Block

## Purpose

The Page Link Block creates an internal reference to another LifeHub Page.

It enables building interconnected knowledge graphs across the system.

---

## Description

Unlike external links, Page Links reference Pages by their internal identifier.

The target Page remains the single source of truth.

---

## Data Structure

```json
{
    "type": "page_link",
    "content": {
        "page_id": "",
        "title": ""
    }
}
```

---

## Supported References

Can reference:

- normal pages
- subpages
- database rows
- templates
- archived pages (optional)

---

## Rendering

Displays:

- page icon
- page title
- optional breadcrumb
- optional page description

---

## Navigation

Selecting the block opens the referenced Page.

Navigation follows the global Pages navigation system.

---

## Backlinks

Every Page Link automatically creates a backlink.

Backlinks are indexed for:

- navigation
- search
- graph visualization

---

## Broken Links

If the target Page is deleted:

- display warning
- preserve original reference
- allow reassignment

---

## Permissions

Target Page permissions are evaluated before opening.

Users without access receive an access denied state.

---

## Accessibility

Page Links behave like standard hyperlinks.

Keyboard navigation is fully supported.

---

## Future Extensions

- inline previews
- hover cards
- graph visualization
- relation analytics
