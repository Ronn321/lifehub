# Pages Offline Support System

## Overview
Offline support enables Pages to function without network connectivity, especially important for NAS and mobile usage scenarios.

---

## Core Concept

Pages system must operate in:

- fully offline mode
- partially synced mode
- fully online mode

---

## Offline Architecture

### Local Layer
- local cache of pages
- IndexedDB storage (frontend)
- optional local SQLite (backend sync agent)

### Sync Layer
- delta synchronization
- conflict resolution
- version reconciliation

---

## Cached Data Types

- pages metadata
- blocks
- navigation tree
- templates
- recent search results

---

## Sync Strategy

### 1. Event-Based Sync
- every change produces event
- events queued locally

### 2. Batch Sync
- periodic sync to server
- compressed payload

### 3. Conflict Resolution
- last-write-wins (default)
- optional merge strategies

---

## Offline Editing

- full block editing supported
- changes stored locally
- marked as "pending sync"

---

## Sync States

- synced
- pending
- conflict
- failed

---

## Media Handling

- images cached locally
- videos streamed when online
- fallback placeholders offline

---

## Search Offline

- limited local index
- recent pages only
- cached query results

---

## Constraints

- no real-time collaboration offline
- no external API calls
- limited search scope

---

## Future Enhancements

- peer-to-peer sync (LAN mode)
- conflict diff UI
- selective offline pinning
