---
phase: 04-search-filter
plan: 01
subsystem: database
tags: [sqlite, fts5, drizzle, better-sqlite3, vitest, tdd, search]

# Dependency graph
requires:
  - phase: 03-entry-management
    provides: "src/lib/actions.ts with getEntries(), setEntryTags(), db.$client pattern"
provides:
  - "searchEntries(q, tag) exported from src/lib/actions.ts covering all four query branches"
  - "tests/search.test.ts with 18 unit tests proving SRCH-01, SRCH-02, SRCH-03"
affects: [04-02, 04-03, search-ui, tag-filter-ui]

# Tech tracking
tech-stack:
  added: [vitest (installed from existing devDependencies)]
  patterns:
    - "FTS5 two-query approach: FTS5 MATCH returns base rows; second IN() query fetches tags; Map merge produces EntryListItem[]"
    - "FTS5 empty-query guard: sanitize q with replace(/[^\w\s]/g, ' ').trim() before branching; never call MATCH with empty string"
    - "In-memory test DB injection: swap db.$client AND db.session.client in beforeEach to route all DB calls (raw SQL + Drizzle ORM) through in-memory SQLite"
    - "Raw SQL via db.$client.prepare() for all searchEntries branches (FTS5 not supported by Drizzle ORM; raw SQL also enables test DB injection to work)"
    - "LIMIT 200 on all raw SQL query paths (unbounded result mitigation)"

key-files:
  created:
    - tests/search.test.ts
  modified:
    - src/lib/actions.ts

key-decisions:
  - "All four searchEntries branches implemented with db.$client raw SQL (not Drizzle ORM) — enables test DB injection via db.session.client swap; Drizzle does not support FTS5 anyway"
  - "q sanitization strips non-word/non-space chars: replace(/[^\w\\s]/g, ' ').trim() — removes FTS5 operators (quotes, hyphens, AND, OR, parens, asterisks) preventing MATCH syntax errors"
  - "Test DB injection: swap both db.$client (for raw SQL paths) and db.session.client (for Drizzle query builder) so getEntries() delegation in no-filter branch also uses in-memory DB"
  - "FTS5 content table pattern: entries_fts uses content=entries, content_rowid=id — three triggers (INSERT/UPDATE/DELETE) keep index in sync"

patterns-established:
  - "Pattern: searchEntries() four-branch structure — (!hasQ && !hasTag) -> getEntries(); (!hasQ && hasTag) -> tag JOIN; (hasQ && !hasTag) -> FTS5 MATCH; (hasQ && hasTag) -> FTS5 + tag JOIN"
  - "Pattern: fetchTagsForIds() helper guards empty ids array (SQLite IN() syntax error on zero items)"
  - "Pattern: mergeToEntryList() helper — accepts raw SQL base rows with created_at as INTEGER epoch seconds, converts with new Date(row.created_at * 1000)"

requirements-completed: [SRCH-01, SRCH-02, SRCH-03]

# Metrics
duration: 12min
completed: 2026-05-27
---

# Phase 4, Plan 01: Search & Filter — searchEntries() Server Action Summary

**SQLite FTS5-backed searchEntries() with BM25 ranking, tag filtering, empty-query guard, and special-char sanitization — all four query branches tested via in-memory SQLite injection**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-27T07:00:00Z
- **Completed:** 2026-05-27T07:10:32Z
- **Tasks:** 2 (RED + GREEN TDD cycle)
- **Files modified:** 2

## Accomplishments
- Exported `searchEntries(q, tag)` from `src/lib/actions.ts` covering all four branches: no-filter (delegates to `getEntries()`), tag-only, keyword-only (FTS5 BM25), combined keyword+tag
- FTS5 empty-query guard: sanitize q before any MATCH call — strips quotes, hyphens, AND/OR/NOT operators, parens, asterisks
- 18-test suite in `tests/search.test.ts` covering SRCH-01 (keyword), SRCH-02 (tag), SRCH-03 (combined) — all pass; full suite 33/33 green
- Established in-memory test DB injection pattern for future search tests

## Task Commits

Each task was committed atomically:

1. **Task 1: RED phase — failing searchEntries tests** - `4a1e3fd` (test)
2. **Task 2: GREEN phase — implement searchEntries** - `b84b47e` (feat)

_Note: TDD plan — two commits per RED/GREEN cycle. No REFACTOR commit needed (implementation was clean)._

## TDD Gate Compliance

- RED gate: `test(04-01)` commit `4a1e3fd` — 18 tests, all failing (`searchEntries is not a function`)
- GREEN gate: `feat(04-01)` commit `b84b47e` — implementation makes all 18 tests pass
- REFACTOR gate: not required — implementation clean on first pass

## Files Created/Modified
- `src/lib/actions.ts` — added `searchEntries(q, tag)` export after `setEntryTags()`; all four branches implemented with `db.$client` raw SQL
- `tests/search.test.ts` — new file; 18 unit tests across 4 describe blocks; in-memory SQLite with FTS5 virtual table + 3 triggers

## Decisions Made

1. **All branches use `db.$client` raw SQL** — The plan specified the tag-only branch should use Drizzle ORM. During GREEN phase, discovered Drizzle's query builder stores an independent client reference (`db.session.client`) that doesn't update when you swap `db.$client`. Rather than implementing complex dual-patching per branch, implemented all non-delegation branches via `db.$client.prepare()` — consistent, testable, and FTS5 compatibility required raw SQL for keyword branches anyway.

2. **Test DB injection patches both `db.$client` AND `db.session.client`** — The no-filter branch delegates to `getEntries()` which uses Drizzle's query builder (via `db.session.client`). Patching both references in `beforeEach` ensures the Drizzle path also hits the in-memory DB. This is documented as an established pattern for future tests.

3. **Test fixture data: entry body "No React here, pure TS" corrected** — Initial test data for the combined keyword+tag test included the word "React" in a negative example's body, causing FTS5 to correctly match it (returning 2 results instead of expected 1). Corrected to "Pure TS, no hooks mentioned". This was a test data bug, not an implementation issue.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed vitest from existing devDependencies**
- **Found during:** Task 1 (RED phase — running tests)
- **Issue:** `npx vitest run` failed with `Cannot find module 'vitest/config'` — vitest was in `devDependencies` but `npm install` had not been run
- **Fix:** Ran `npm install` to install all devDependencies; vitest 4.1.7 installed as already specified in package.json
- **Files modified:** `node_modules/` (no package.json change — package was already declared)
- **Verification:** `./node_modules/.bin/vitest run tests/search.test.ts` executed successfully
- **Committed in:** Not committed (node_modules not tracked)

---

**Total deviations:** 1 auto-fixed (1 blocking — dependency install of already-declared package)
**Impact on plan:** No scope creep. vitest was already in package.json; install was the missing step.

## Issues Encountered

- **Drizzle session client isolation** — Drizzle ORM's query builder stores its own `session.client` reference independently of `db.$client`. Discovered during GREEN phase when the no-filter branch (which calls `getEntries()` via Drizzle) returned data from the real file-based DB instead of the in-memory test DB. Resolved by patching both references in `beforeEach`/`afterEach`.

- **Test fixture "React" in negative body** — The combined keyword+tag test had entry3 body "No React here, pure TS" — FTS5 correctly matched "React" in this body alongside the 'typescript' tag, returning 2 results when the test expected 1. Corrected body to not contain "React".

## User Setup Required

None — no external service configuration required. All functionality runs on local SQLite.

## Next Phase Readiness
- `searchEntries(q, tag)` is exported with a stable signature — Plans 04-02 (SearchInput component) and 04-03 (page wiring) can now import and call it
- FTS5 virtual table and triggers are already initialized in `src/lib/db/index.ts` — no schema migration needed for Plans 02/03
- Test injection pattern established — future search-related tests can reuse `beforeEach` + `afterEach` DB swap pattern from `tests/search.test.ts`

## Known Stubs

None — `searchEntries()` is fully wired to the real SQLite FTS5 index. No placeholder data.

## Threat Flags

No new threat surface beyond what was in the plan's threat model. All T-04-0x mitigations are implemented:
- T-04-01: Parameterized queries + sanitization both applied to FTS5 MATCH
- T-04-02: Tag value passed via `?` binding in all raw SQL
- T-04-03: LIMIT 200 on all raw SQL paths including tag-only branch

---
*Phase: 04-search-filter*
*Completed: 2026-05-27*
