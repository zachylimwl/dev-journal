---
status: partial
phase: 03-write-loop
source: [03-VERIFICATION.md]
started: 2026-05-26T06:55:00Z
updated: 2026-05-26T06:55:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Autosave first-save redirect
expected: URL changes from /new to /entries/[id]/edit after ~500ms of typing, without a page reload
result: [pending]

### 2. Edit page pre-population
expected: opening /entries/[id]/edit pre-fills title, body, and tags from the database on reload
result: [pending]

### 3. Tag chip interaction
expected: pressing Enter or comma after typing a tag name creates a normalized chip; duplicate tags are silently rejected
result: [pending]

### 4. Chip removal triggers autosave
expected: clicking the × button on a tag chip removes it and fires an autosave within 500ms
result: [pending]

### 5. AlertDialog opens with correct copy
expected: clicking the Delete button opens a modal with exact title "Delete entry?" and description "This will permanently delete this journal entry. This action cannot be undone."
result: [pending]

### 6. Delete confirm flow
expected: clicking "Delete" in the confirm dialog deletes the entry from the DB and redirects to /
result: [pending]

### 7. Delete cancel flow
expected: clicking "Cancel" in the confirm dialog closes the modal without making any DB changes
result: [pending]

### 8. Delete from edit page
expected: the DeleteButton on the /entries/[id]/edit page functions identically to the one on the detail page
result: [pending]

### 9. Autosave status label
expected: "Saving..." appears during save, transitions to "Saved just now", then fades out after 2500ms
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
