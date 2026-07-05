# Link Block

## Purpose

The Link Block represents an external web resource.

Unlike inline links, it is displayed as an independent content block.

---

## Description

The Link Block provides a rich preview of a website including metadata whenever available.

It is intended for bookmarking, documentation and research.

---

## Data Structure

```json
{
    "type": "link",
    "content": {
        "url": "",
        "title": "",
        "description": "",
        "image": ""
    }
}
```

---

## Supported Data

- URL
- title
- description
- preview image
- favicon
- hostname

---

## Metadata Retrieval

When a URL is added:

1. Validate URL
2. Fetch metadata
3. Store metadata
4. Cache preview

Metadata should be refreshed only on user request.

---

## Rendering

Displays:

- preview image
- title
- description
- hostname
- favicon

---

## Interaction

Supports:

- open in new tab
- copy URL
- edit URL
- refresh preview
- delete

---

## Validation

Only valid HTTP and HTTPS URLs are accepted.

Invalid URLs display an error state.

---

## Security

- sanitize metadata
- no embedded scripts
- no automatic execution
- external resources sandboxed

---

## Accessibility

Preview remains fully keyboard accessible.

Links include descriptive labels.

---

## Future Extensions

- archive snapshots
- read-later mode
- website status monitoring
- automatic categorization
