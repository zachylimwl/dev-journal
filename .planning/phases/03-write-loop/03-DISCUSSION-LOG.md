# Phase 3: Write Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 3-Write-Loop
**Areas discussed:** Editor routing & flow, Tag input UX, Delete confirmation, Autosave status indicator

---

## Editor Routing & Flow

### When clicking an entry card

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only detail page + Edit button | Phase 2's /entries/[id] stays as-is. Edit button routes to /entries/[id]/edit — clear read/write separation. | ✓ |
| Card goes straight to edit mode | Detail page replaced by editor. No separate read mode. | |
| Detail page with in-place toggle | Single page switching between read and edit mode. No second route. | |

**User's choice:** Read-only detail page + Edit button

---

### Where "New Entry" lives and what it does

| Option | Description | Selected |
|--------|-------------|----------|
| Button in AppHeader → routes to /new page | Entry created in DB on first autosave. | ✓ |
| Button in AppHeader → creates blank DB record immediately, redirects to /entries/[id]/edit | Stub entry created on click; may leave orphan records. | |
| Button on home page (not header) | Write/+ button in entry list area. | |

**User's choice:** Button in AppHeader → routes to /new page

---

### After saving a new entry (first autosave fires)

| Option | Description | Selected |
|--------|-------------|----------|
| Stay on /new until user navigates away | Entry saved silently. User stays in editor. | |
| Redirect to /entries/[id]/edit after first save | URL becomes bookmarkable once the entry has an ID. | ✓ |
| You decide | No strong preference. | |

**User's choice:** Redirect to /entries/[id]/edit after first save

---

## Tag Input UX

### How tags are displayed and removed in the editor

| Option | Description | Selected |
|--------|-------------|----------|
| Chip UI with × buttons | Reuses TagChip from Phase 2. Each chip has × to remove. Consistent with card/detail view. | ✓ |
| Plain text list with remove links | Tags as text with [remove] link. Simpler but inconsistent with TagChip style. | |
| No explicit remove UI — re-type to toggle | User removes by editing the text input. Less discoverable. | |

**User's choice:** Chip UI with × buttons

---

### How the user adds a new tag

| Option | Description | Selected |
|--------|-------------|----------|
| Text input + Enter/comma to add | Natural for developers who type fast. | ✓ |
| Text input + Add button | Explicit but slower. | |
| Single comma-separated text field | Edit all tags at once; normalized on blur/save. | |

**User's choice:** Text input + Enter/comma to add

---

### Where tags live in the editor layout

| Option | Description | Selected |
|--------|-------------|----------|
| Below title, above Markdown editor | Natural document structure: title → tags → body. | ✓ |
| Below the Markdown editor (footer) | Tags as afterthought. | |
| Sidebar or inline with editor toolbar | Complex; depends on @uiw/react-md-editor toolbar customization. | |

**User's choice:** Below title, above Markdown editor

---

## Delete Confirmation

### Type of confirmation prompt

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn/ui AlertDialog modal | Consistent with component system. "Delete entry?" + Cancel/Delete. | ✓ |
| Inline two-step confirmation | Button changes to "Confirm delete? [Yes] [No]". No modal but takes UI space. | |
| Browser window.confirm() | Native dialog. Zero UI but looks out of place; blocks JS thread. | |

**User's choice:** shadcn/ui AlertDialog modal

---

### Where the Delete action lives

| Option | Description | Selected |
|--------|-------------|----------|
| On detail page only | User must read entry before deleting. | |
| On edit page only | User must open editor to delete. | |
| On both detail page and edit page | Delete available in both contexts. | ✓ |

**User's choice:** Both detail page and edit page

---

### After deletion, where the user lands

| Option | Description | Selected |
|--------|-------------|----------|
| Home page / entry list | Redirect to / — entry is gone, list is the natural next view. | ✓ |
| Stay on current page with error state | Page reloads deleted entry, shows 404. | |
| You decide | No strong preference. | |

**User's choice:** Home page / entry list

---

## Autosave Status Indicator

### How autosave status is communicated

| Option | Description | Selected |
|--------|-------------|----------|
| Small status text near the editor | Subtle label in editor header area. Non-intrusive, always in context. | ✓ |
| Silent — no indicator | Save happens with no UI feedback. Minimalist. | |
| Toast notification | Brief toast after each save. Gets repetitive during active writing. | |

**User's choice:** Small status text near the editor

---

### What states the indicator shows

| Option | Description | Selected |
|--------|-------------|----------|
| "Saving..." → "Saved" | Two states: in-flight and done. Simple, stays visible. | |
| "Saving..." → "Saved just now" → fades out | Three states with fade-out. Cleaner idle state. | ✓ |
| You decide | No strong preference. | |

**User's choice:** "Saving..." → "Saved just now" → fades out

---

## Claude's Discretion

- Exact editor layout within `/new` and `/entries/[id]/edit` (header/toolbar/padding structure beyond title → tags → body ordering)
- Whether to use a shared editor component or two separate page files
- Autosave fade-out duration (suggested: 2–3 seconds)
- Exact wording and button styling in the AlertDialog

## Deferred Ideas

None — discussion stayed within phase scope.
