# USERS FEATURE

## Goal
Central identity and permission system.

---

## Features

- user registration
- family grouping
- role assignment
- permissions per domain
- profile management

---

## Entities

- User
- Role
- Permission
- Group

---

## Screens

- User List
- User Profile
- Role Editor
- Permission Matrix

---

## API

```
GET    /users
POST   /users
GET    /users/{id}
PUT    /users/{id}

GET    /roles
POST   /roles
```

---

## Rules

- every request is user-scoped
- admin only can modify roles
