# Pages Permissions Model

## Overview

The Pages domain uses a hybrid permission system:

- Ownership-based access
- RBAC roles (global system roles)
- Page-level sharing rules
- Block-level inheritance

---

## Ownership Rules

Each page has:

- owner_id (absolute control)
- created_by (audit reference)

Owner can:
- edit
- delete
- share
- move
- override permissions

---

## Role-Based Access Control (RBAC)

Global roles:

- admin
- family
- member
- guest

Permissions:

- pages.read
- pages.write
- pages.delete
- pages.share
- pages.admin

---

## Page-Level Permissions

### Table: page_permissions

| Field | Type |
|------|------|
| id | UUID |
| page_id | UUID |
| subject_type | user | role |
| subject_id | UUID |
| permission | read/write/admin |
| inherited | boolean |

---

## Inheritance Model

- Subpages inherit permissions from parent
- Can be overridden per page
- Explicit deny overrides allow

---

## Block Permissions

Blocks inherit page permissions by default.

Optional override:

- block visibility rules
- block edit restrictions

---

## Sharing Model

Pages can be shared with:

- users
- roles
- groups (future)

Access types:

- read
- comment (future)
- edit
- admin

---

## Security Rules

- Vault domain cannot be embedded writable
- Finance domain is read-only in Pages
- System pages require admin override
- All permission changes are audited

---

## Enforcement Layer

Permissions enforced at:

1. API layer (backend)
2. Query layer (DB filters)
3. UI layer (conditional rendering)

---

## Key Principle

Permissions are always evaluated as:

Owner → Role → Page Override → Block Override
