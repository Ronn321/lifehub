# Pages Import & Export System

## Overview
The import/export system enables Pages to be portable, shareable, and interoperable with external systems such as Markdown, JSON, and third-party tools.

---

## Core Concept

Pages can be:

- exported into structured formats
- imported from external sources
- converted between formats

---

## Supported Formats

### Export Formats

- JSON (full fidelity)
- Markdown (simplified representation)
- HTML (read-only export)
- PDF (rendered output)
- Archive (.zip with assets)

### Import Formats

- Markdown
- JSON (Pages schema)
- Notion-like exports (future)
- HTML (basic parsing)

---

## Export Model

### Full Export Structure

```json
{
  "page": {},
  "blocks": [],
  "relations": [],
  "metadata": {}
}
```

---

## Markdown Export Rules

- blocks converted to markdown equivalents
- hierarchy preserved via headings
- media referenced as links
- tables simplified

---

## Import Pipeline

### Steps

1. Parse input format
2. Normalize structure
3. Map to block system
4. Validate schema
5. Create Page + Blocks
6. Attach metadata

---

## Asset Handling

- images copied to Media domain
- files stored in NAS storage layer
- external links preserved as references

---

## Version Preservation

- imports generate initial version snapshot
- imported pages are fully versioned
- history starts from import event

---

## Conflict Handling

- duplicate page detection via hash
- optional merge mode
- overwrite protection

---

## Bulk Operations

- multi-page export
- folder/page tree export
- batch import with mapping rules

---

## Security Rules

- sanitize imported HTML
- strip unsafe scripts
- validate external links
- enforce permission mapping

---

## Use Cases

- migration from Notion
- backup of LifeHub data
- sharing project pages
- archival storage on NAS
- offline transfer via USB

---

## Future Enhancements

- live sync import (external tools)
- bidirectional Notion sync
- Git-based page version export
- AI-assisted structure normalization
