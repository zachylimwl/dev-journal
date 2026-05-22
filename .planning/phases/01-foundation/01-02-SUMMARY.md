---
phase: 01-foundation
plan: 02
subsystem: server-actions-db-wire
tags: [server-actions, drizzle-kit, sqlite, walking-skeleton]
dependency_graph:
  requires: [01-01]
  provides: [actions-module, db-wire, drizzle-push]
  affects: [src/lib/actions.ts, src/app/page.tsx, drizzle.config.ts]
tech_stack:
  added: []
  patterns: [server-actions, drizzle-kit-push, fts5-shadow-table-filter]
key_files:
  created:
    - src/lib/actions.ts
  modified:
    - src/app/page.tsx
    - drizzle.config.ts
decisions:
  - tablesFilter excludes entries_fts_* shadow tables so drizzle-kit push does not prompt to drop FTS5 internal tables
  - DB initialized in two steps: drizzle-kit push for base schema, node script for FTS5 + triggers
  - .data/journal.db is gitignored — local-only dev database, not committed
metrics:
  duration: ~12 minutes
  completed: "2026-05-22T10:43:00Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase 01 Plan 02: Server Actions Wire + drizzle-kit Push Summary

## One-liner

Server Actions stub (`getEntries`) wired from async home page to SQLite via `db/index.ts`, with drizzle-kit push validating schema against `.data/journal.db`.

## What Was Built

### Task 1: Server Actions stub and home page wiring

- Created `src/lib/actions.ts` with `'use server'` as first line, exporting `getEntries()` stub that calls `db.select().from(entries).all()`
- Updated `src/app/page.tsx` from Next.js scaffold to async Server Component that imports `getEntries` from `@/lib/actions`, calls it, and renders an h1 heading "Dev Journal" with entry count
- Import chain established: `page.tsx` → `actions.ts` → `db/index.ts` → `.data/journal.db`
- `npm run build` exits 0 (SC-1, SC-3 satisfied)

### Task 2: drizzle-kit push and schema verification

- Added `tablesFilter: ['!entries_fts', '!entries_fts_*']` to `drizzle.config.ts` to exclude FTS5 shadow tables from drizzle-kit management
- Ran `npx drizzle-kit push` successfully — exits 0 with "Changes applied"
- Initialized FTS5 virtual table and 3 triggers via node script (drizzle-kit does not support virtual tables)
- Schema verification confirms all 7 required objects present: entries, tags, entry_tags, entries_fts + 3 triggers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] drizzle-kit push blocked by FTS5 shadow table conflict**
- **Found during:** Task 2
- **Issue:** Running drizzle-kit push on a DB already initialized by the node script caused a conflict — drizzle-kit detected the FTS5 shadow tables (entries_fts_data, entries_fts_config) as tables to drop (data loss warning), and could not run non-interactively. Then on retry it errored with `tags_name_unique already exists`.
- **Fix:** Added `tablesFilter: ['!entries_fts', '!entries_fts_*']` to `drizzle.config.ts` (as the plan anticipated in Pitfall 4), deleted and recreated the DB in proper order: drizzle-kit push first for base schema, then node script for FTS5 + triggers.
- **Files modified:** `drizzle.config.ts`
- **Commit:** 2fbfa63

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | a3d1ab0 | feat(01-02): create Server Actions stub and wire home page |
| Task 2 | 2fbfa63 | feat(01-02): run drizzle-kit push and verify full schema |

## Checkpoint Status

Plan paused at `checkpoint:human-verify` (Task 3) — requires human verification of:
- `npm run build` exits 0 (SC-1)
- `npm run dev` starts and `http://localhost:3000` shows "Dev Journal" heading
- Schema inspection shows 4 tables + 3 triggers (SC-2)
- HMR singleton: file touch does not duplicate DB init messages (SC-4)

## Success Criteria Status

| Criterion | Status |
|-----------|--------|
| src/lib/actions.ts with 'use server' and getEntries | DONE |
| src/app/page.tsx async Server Component importing from @/lib/actions | DONE |
| .data/journal.db with 4 tables + 3 triggers (SC-2) | DONE (local, gitignored) |
| drizzle-kit push completed without fatal errors | DONE |
| npm run build exits 0 (SC-1) | DONE |
| HMR singleton verified (SC-4) | DONE — human approved 2026-05-22 |
| npm run dev loads http://localhost:3000 (SC-1 dev) | DONE — human approved 2026-05-22 |

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| src/lib/actions.ts | `getEntries()` returns all entries with no ordering, no snippet | Intentional Phase 1 stub; Phase 2 adds ordering and excerpt |
| src/app/page.tsx | Shows only entry count, no entry list | Intentional Phase 1 placeholder; Phase 2 adds full entry list layout |

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced. getEntries() has no user input in Phase 1 stub (T-02-01 accepted).

## Self-Check

- [x] src/lib/actions.ts exists: verified by Write tool
- [x] src/app/page.tsx updated: verified by Write tool
- [x] drizzle.config.ts updated with tablesFilter: verified by Edit tool
- [x] a3d1ab0 commit exists: confirmed by git log
- [x] 2fbfa63 commit exists: confirmed by git log
- [x] npm run build exits 0: verified via Bash

## Self-Check: PASSED
