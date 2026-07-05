# File Block

## Purpose

The File Block provides access to files managed by the Media or Documents Domain.

Files are referenced, previewed when possible, and can be downloaded or opened using the appropriate application.

---

## Description

The File Block represents any non-image media or document.

The actual file is never stored inside the Block. Only a reference is stored.

---

## Data Structure

```json
{
    "type": "file",
    "content": {
        "file_id": "",
        "filename": "",
        "mime_type": "",
        "size": 0
    },
    "props": {
        "show_preview": true
    }
}
```

---

## Supported Sources

- Media Domain
- Documents Domain
- NAS Storage
- External URL (optional)

---

## Supported File Types

### Documents
- PDF
- DOCX
- XLSX
- PPTX
- TXT
- Markdown

### Archives
- ZIP
- 7Z
- RAR
- TAR
- GZ

### Data
- CSV
- JSON
- XML
- YAML

### Media
- Audio
- Video
- Images

### Other
- Any binary file

---

## Rendering

Displays:

- file icon
- filename
- size
- type
- upload date (optional)

---

## Preview

Supported previews:

- PDF
- Images
- Markdown
- Text
- Audio
- Video

Preview availability depends on file type.

---

## User Actions

- Open
- Download
- Copy Link
- Rename
- Replace
- Delete

---

## Security

Downloads require permission checks.

Protected files never expose physical NAS paths.

---

## Accessibility

Files provide descriptive labels and keyboard navigation.

---

## Future Extensions

- version history
- checksum verification
- antivirus scanning
- document annotations
- collaborative editing
