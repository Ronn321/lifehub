# DOMAIN_MAP.md

## Purpose

Mapping aller Domains und ihrer Beziehungen.

---

## Core Relationship Graph

```
Users
 ├── Media
 ├── Travel
 ├── Projects
 ├── Finance
 ├── Vault
 ├── Calendar
 ├── IT Inventory
 ├── Documents

Media
 ├── Travel (uses media)
 ├── Projects (attachments)
 ├── Recipes (images)

Finance
 ├── Documents (receipts)
 ├── Insurance

Vault
 ├── IT Inventory (credentials mapping)

Calendar
 ├── Travel (events)
 ├── Finance (billing reminders)
 ├── Integrations (Google OAuth2 + Calendar client)
 ├── Users

Integrations
 ├── Calendar (Google Calendar client)
 ├── Email (Gmail client)

Email
 ├── Integrations (Gmail client)
 ├── Users

Search
 ├── ALL DOMAINS

Dashboard
 ├── ALL DOMAINS

Plugins
 ├── ALL DOMAINS
```

---

## Rule

Domains communicate ONLY via IDs or APIs, never directly via database joins across domains.
