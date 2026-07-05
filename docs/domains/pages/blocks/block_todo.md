# Todo Block

## Purpose

The Todo Block provides lightweight task management directly inside Pages.

It is intended for personal notes, project planning and simple checklists.

---

## Description

Each Todo Block represents one task.

Multiple Todo Blocks together form a checklist.

---

## Data Structure

```json
{
    "type": "todo",
    "content": {
        "text": "",
        "completed": false
    },
    "props": {
        "priority": "normal"
    }
}
```

---

## Supported Properties

- Task Text
- Completion State
- Priority

Future:

- Due Date
- Reminder
- Assignee
- Tags

---

## User Actions

- Complete Task
- Edit Task
- Duplicate
- Delete
- Reorder

---

## Completion Behavior

Completed tasks remain visible.

Optional future setting: Hide Completed Tasks

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter | Create new Todo |
| Space | Toggle completion |
| Backspace | Delete empty Todo |

---

## Rendering

Displays:

- checkbox
- task text
- optional metadata

---

## Accessibility

Checkbox is fully keyboard accessible.

Completion state is announced to screen readers.

---

## Validation

Task text may be empty during editing.

Completion defaults to false.

---

## Future Extensions

- recurring tasks
- reminders
- integration with Calendar Domain
- synchronization with MorphCook shopping lists
