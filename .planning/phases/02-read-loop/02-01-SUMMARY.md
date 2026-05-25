---
phase: 02-read-loop
plan: "01"
subsystem: database
tags: [react-markdown, remark-gfm, rehype-highlight, tailwindcss-typography, drizzle-orm, sqlite, server-actions]

requires:
  - phase: 01-foundation
    provides: Drizzle schema (entries, tags, entryTags), db singleton, Server Actions stub, globals.css base

provides:
  - react-markdown + remark-gfm + rehype-highlight installed
  - "@tailwindcss/typography plugin activated in globals.css"
  - highlight.js github-dark CSS theme imported in globals.css
  - generateSnippet() and formatEntryDate() pure utilities in src/lib/utils/format.ts
  - EntryListItem and EntryDetail types exported from src/lib/actions.ts
  - getEntries() with LEFT JOIN + Map reduce, newest-first, with snippet and dateLabel
  - getEntryById(id) with LEFT JOIN + tag aggregation, returns null for missing entries

affects: [02-read-loop plan 02 — UI components + pages that consume EntryListItem and EntryDetail]

tech-stack:
  added:
    - react-markdown (markdown rendering to React elements)
    - remark-gfm (GitHub Flavored Markdown — tables, strikethrough, task lists)
    - rehype-highlight (code block syntax highlighting via highlight.js)
    - "@tailwindcss/typography (prose classes for Markdown body)"
  patterns:
    - Tailwind v4 CSS-first plugin activation via @plugin directive in globals.css
    - highlight.js CSS theme imported in globals.css (not component-level) for reliability
    - Drizzle LEFT JOIN + Map reduce for flat rows → aggregated entry objects
    - Map (not plain object) for row reduction — preserves insertion order

key-files:
  created:
    - src/lib/utils/format.ts
  modified:
    - src/lib/actions.ts
    - src/app/globals.css
    - package.json

key-decisions:
  - "Import highlight.js CSS in globals.css (not in markdown-body.tsx) — loads on every page, avoids Next.js tree-shaking issues with Server Component CSS imports"
  - "Use Map for row reduction in getEntries/getEntryById — preserves insertion order matching orderBy(desc(createdAt))"
  - "No revalidatePath calls added — Phase 2 has no mutations; plan 01 is read-only"

patterns-established:
  - "Pattern: Drizzle LEFT JOIN + JS Map reduce — flat rows from multi-table join collapsed into per-entry objects with aggregated tags[]"
  - "Pattern: generateSnippet strips Markdown syntax chars, truncates at word boundary <= 300 chars with ellipsis"
  - "Pattern: formatEntryDate is server-side only — prevents hydration mismatch between server and client rendering"

requirements-completed: [VIEW-01, VIEW-03]

duration: 2min
completed: "2026-05-25"
---

# Phase 2 Plan 01: Read Loop — Data Layer & CSS Infrastructure Summary

**Markdown rendering deps installed, Tailwind typography + github-dark CSS activated, generateSnippet/formatEntryDate utilities created, and getEntries/getEntryById Server Actions fully implemented with LEFT JOIN + Map reduce.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-25T10:24:37Z
- **Completed:** 2026-05-25T10:26:38Z
- **Tasks:** 2
- **Files modified:** 4 (package.json, globals.css, format.ts [new], actions.ts)

## Accomplishments

- Installed react-markdown, remark-gfm, rehype-highlight, @tailwindcss/typography (4 packages)
- Activated Tailwind typography plugin and github-dark highlight.js CSS theme in globals.css
- Created src/lib/utils/format.ts with generateSnippet() (Markdown-stripped, word-boundary truncation) and formatEntryDate() (relative + absolute date)
- Extended src/lib/actions.ts with full getEntries() (LEFT JOIN + Map reduce, newest-first) and getEntryById() (LEFT JOIN + tag aggregation, null-safe)
- Exported EntryListItem and EntryDetail types for use by Plan 02 UI components

## Task Commits

1. **Task 1: Install dependencies and configure globals.css** - `4df4c47` (feat)
2. **Task 2: Create format utilities and extend Server Actions** - `d7d6ab2` (feat)

## Files Created/Modified

- `src/lib/utils/format.ts` — generateSnippet() and formatEntryDate() pure utilities
- `src/lib/actions.ts` — extended with EntryListItem, EntryDetail types, full getEntries() and getEntryById()
- `src/app/globals.css` — added @plugin "@tailwindcss/typography" and @import "highlight.js/styles/github-dark.css" after line 1
- `package.json` — 4 new dependencies added

## Decisions Made

- Imported highlight.js CSS in globals.css (not inside markdown-body.tsx) — more reliable in Next.js 16, loads on every page, avoids potential tree-shaking issues with Server Component CSS imports
- Used Map (not plain object) for row reduction — Map preserves insertion order matching orderBy(desc(createdAt)); plain object key ordering is not guaranteed
- Compute `now = new Date()` once outside the loop in getEntries() — ensures consistent relative dates across all entries in a single request

## Deviations from Plan

None — plan executed exactly as written. The PATTERNS.md patterns were used for the getEntries() implementation (inline snippet/dateLabel computation vs. deferred in the final map), which is a functionally equivalent approach — the PATTERNS.md version computes snippet and dateLabel eagerly in the map.set() call, while the plan's pseudocode showed them in the final Array.from().map() step. Both are correct; PATTERNS.md version was used as it is more readable.

## Issues Encountered

None — npm install succeeded cleanly, TypeScript exits 0, `npm run build` exits 0.

## Verification Results

All checks passed:

1. `npx tsc --noEmit` — exits 0
2. `npm run build` — exits 0 (Next.js 16 Turbopack, 4 static pages generated)
3. `grep "@plugin" src/app/globals.css` — matches `@plugin "@tailwindcss/typography";`
4. `grep "github-dark" src/app/globals.css` — matches `@import "highlight.js/styles/github-dark.css";`
5. `grep "export type EntryListItem" src/lib/actions.ts` — matches
6. `grep "export type EntryDetail" src/lib/actions.ts` — matches
7. `grep "getEntryById" src/lib/actions.ts` — matches
8. `grep -c "leftJoin" src/lib/actions.ts` — outputs 4 (2 per function × 2 functions)
9. `grep -c "new Map" src/lib/actions.ts` — outputs 1

## User Setup Required

None — no external service configuration required. All dependencies are npm packages.

## Next Phase Readiness

Plan 02 (UI components + pages) can proceed immediately. Contracts available:
- `EntryListItem` type for entry-card.tsx
- `EntryDetail` type for entries/[id]/page.tsx
- `getEntries()` for home page (src/app/page.tsx)
- `getEntryById(id)` for detail page (src/app/entries/[id]/page.tsx)
- `prose` Tailwind class available for MarkdownBody component
- `github-dark.css` loaded globally for code highlighting

---
*Phase: 02-read-loop*
*Completed: 2026-05-25*
