---
phase: 03-write-loop
plan: 02
subsystem: data-layer
tags: [server-actions, drizzle-orm, better-sqlite3, next.js, app-header, crud]

# Dependency graph
requires:
  - phase: 03-write-loop
    plan: 01
    provides: Vitest test infrastructure, actions.test.ts (8 tests), schema.ts (entries/tags/entryTags)
provides:
  - createEntry Server Action — inserts entry row, returns { id: number }
  - updateEntry Server Action — updates title/body/updatedAt, revalidates / and /entries/[id]
  - deleteEntry Server Action — deletes entry row (ON DELETE CASCADE handles entry_tags)
  - setEntryTags Server Action — server-side normalize + delete-all + upsert pattern
  - AppHeader "New Entry" link — href="/new", bg-zinc-900 styled, Server Component
affects:
  - 03-03-PLAN (EditorForm calls createEntry/updateEntry/setEntryTags from this plan)
  - 03-04-PLAN (DeleteButton calls deleteEntry from this plan)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drizzle .returning({ id: entries.id }).all() for INSERT with returned ID"
    - "Drizzle .set({ updatedAt: new Date() }) for timestamp mutation"
    - "Server-side tag normalization: trim + toLowerCase + Set dedup + filter(Boolean)"
    - "delete-all then upsert loop with onConflictDoNothing for junction table management"
    - "revalidatePath('/') + revalidatePath('/entries/${id}') for targeted cache invalidation"

key-files:
  created: []
  modified:
    - "src/lib/actions.ts — appended createEntry, updateEntry, deleteEntry, setEntryTags"
    - "src/components/app-header.tsx — replaced placeholder div with Link href=/new"

key-decisions:
  - "createEntry uses .returning().all() not .execute() — synchronous better-sqlite3 pattern"
  - "deleteEntry has no manual entryTags cleanup — ON DELETE CASCADE in schema handles it"
  - "setEntryTags normalizes before any DB operation — server-side trust boundary"
  - "AppHeader remains Server Component — no 'use client' needed for a Link element"

# Metrics
duration: 10min
completed: 2026-05-26
---

# Phase 3 Plan 02: Server Actions Write Mutations Summary

**Four CRUD Server Actions (createEntry, updateEntry, deleteEntry, setEntryTags) appended to actions.ts using Drizzle synchronous patterns, plus AppHeader "New Entry" link wired to /new**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-26T14:29:00Z
- **Completed:** 2026-05-26T14:31:00Z
- **Tasks:** 2 of 2
- **Files modified:** 2

## Accomplishments

- Appended four exported async Server Actions to src/lib/actions.ts without touching existing getEntries/getEntryById
- createEntry returns `{ id: number }` via `.returning({ id: entries.id }).all()` — consistent with better-sqlite3 synchronous API
- setEntryTags normalizes tagNames server-side (trim + toLowerCase + Set dedup + filter Boolean) before any DB write
- deleteEntry relies on ON DELETE CASCADE — no manual entry_tags cleanup
- AppHeader right-slot placeholder replaced with `<Link href="/new">` styled with bg-zinc-900
- All 8 tests in tests/actions.test.ts pass; npm run build exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Add createEntry, updateEntry, deleteEntry, setEntryTags to actions.ts** - `c467ef7` (feat)
2. **Task 2: Add "New Entry" button to AppHeader right slot** - `011b54d` (feat)

## Files Created/Modified

- `src/lib/actions.ts` — 36 lines appended: createEntry, updateEntry, deleteEntry, setEntryTags
- `src/components/app-header.tsx` — placeholder `{/* Right slot */}\n<div />` replaced with Link

## Decisions Made

- Used `.returning({ id: entries.id }).all()` (not `.get()`) for createEntry — consistent with the test infrastructure's canonical pattern established in Plan 01
- setEntryTags: normalized Set before delete-then-insert loop prevents redundant DB calls for duplicate inputs
- No new imports needed in either file — all Drizzle operators and table refs already imported; Link already imported in AppHeader

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria met on first attempt.

## Known Stubs

None. All four Server Actions perform real Drizzle DB operations against the SQLite instance.

## Threat Surface Scan

No new surface beyond the plan's threat model:
- T-03-02 (tag SQL injection): mitigated — tag name passed via `db.insert(tags).values({ name })` (Drizzle parameterized binding)
- T-03-03 (entry SQL injection): mitigated — title/body passed via `.values({ title, body })` (Drizzle parameterized binding)
- T-03-04 (orphan entries): noted — guard lives in EditorForm caller (Plan 03), not enforced here per design
- T-03-05 (Server Actions as POST): accepted — single-user localhost, no auth required

## Self-Check

Files modified:
- `src/lib/actions.ts`: exists — 6 export async functions confirmed
- `src/components/app-header.tsx`: exists — href="/new" confirmed

Commits:
- `c467ef7`: feat(03-02) — Task 1
- `011b54d`: feat(03-02) — Task 2

Verification results:
- `npx vitest run tests/actions.test.ts`: 8/8 tests pass
- `grep -c "export async function" src/lib/actions.ts`: 6
- `grep "href.*new" src/components/app-header.tsx`: match found
- `npm run build`: exits 0

## Self-Check: PASSED

---
*Phase: 03-write-loop*
*Completed: 2026-05-26*
