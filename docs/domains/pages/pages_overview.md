# Pages Domain Overview

## Purpose
The Pages domain is the core content system of LifeHub. It provides a Notion-like flexible document system where all information is structured as Pages composed of Blocks.

It is NOT a feature module like Travel or Finance, but a foundational UI and data layer that will eventually unify multiple domains.

---

## Core Concept

Everything is a Page.

A Page is a container that can hold:
- Text content
- Media
- Structured data (tables/databases)
- Embedded systems (maps, browser, jellyfin)
- Nested pages (hierarchy)

Each Page is composed of Blocks.

---

## Key Principles

- Block-based architecture (Notion-like)
- Fully hierarchical page tree
- Domain-agnostic content layer
- Extensible via block registry
- Storage separated from rendering
- NAS media integration via Media domain
- Permissions inherited and overridable per page

---

## Responsibilities

The Pages domain handles:

- Page creation and management
- Block composition and ordering
- Page hierarchy (subpages)
- Rendering orchestration
- Editor state management
- Layout persistence
- Page templates
- Cross-domain embedding

---

## Non-Responsibilities

The Pages domain does NOT:

- Store raw media files
- Handle finance logic
- Manage Jellyfin streaming
- Implement business logic of other domains
- Replace domain-specific APIs

It only references external domains via IDs.

---

## High-Level Architecture

Page
  ├── metadata (title, icon, permissions)
  ├── blocks[]
  ├── relations[]
  ├── parent_page_id
  └── template_id

Block
  ├── type
  ├── content
  ├── props
  ├── order
  └── children (optional)

---

## Integration Targets

- Media Domain (images, videos, files)
- Jellyfin Domain (video embeds)
- Finance Domain (read-only widgets)
- Documents Domain (file embedding)
- Search Domain (global indexing)

---

## Evolution Strategy

Phase 1:
- Basic pages + blocks (text, heading, divider)

Phase 2:
- media, links, embeds, subpages

Phase 3:
- databases, tables, templates

Phase 4:
- spreadsheets, browser, maps, plugins
