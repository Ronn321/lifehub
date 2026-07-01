# VAULT FEATURE

## Goal
Secure password and secret storage.

---

## Features

- password storage
- TOTP
- cards
- secure notes

---

## Entities

- VaultEntry
- TOTPSecret
- Card

---

## Screens

- Vault list
- Entry editor
- TOTP view

---

## Security

- AES-256-GCM encryption
- Argon2 hashing
- zero-knowledge design goal

---

## Rules

- vault data never exposed to other domains
