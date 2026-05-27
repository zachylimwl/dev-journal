---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 04
current_plan: 3
status: complete
last_updated: "2026-05-27T07:30:00Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 11
  completed_plans: 11
  percent: 100
---

# Project State: Dev Journal

**Last updated:** 2026-05-27
**Session:** Phase 4, Plan 01 complete — searchEntries() TDD

---

## Project Reference

**Core Value:** A fast place to write and later find anything you've worked on — entries writable in seconds and searchable in seconds

**Stack:** Next.js (App Router) + TypeScript + better-sqlite3 + Drizzle ORM + Tailwind CSS v4 + shadcn/ui + react-markdown + SQLite FTS5

**Run:** `npm run dev` — localhost only, no deployment target for v1

---

## Current Position

Phase: 04 (search-filter) — COMPLETE
Plan: 3 of 3 complete
**Current Phase:** 04
**Current Plan:** 3
**Status:** Complete

```
Progress: [██████████] 100%
Phase 1 [✓] → Phase 2 [✓] → Phase 3 [✓] → Phase 4 [✓]
```

*(✓ = Complete)*

---

## Phase Map

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation | Complete | 01-01, 01-02 |
| 2 | Read Loop | Complete | 02-01, 02-02 |
| 3 | Write Loop | Complete | 03-01, 03-02, 03-03, 03-04 |
| 4 | Search & Filter | Complete | 04-01 ✓, 04-02 ✓, 04-03 ✓ |

---

## Accumulated Context

### Key Decisions (from research)

| Decision | Rationale |
|----------|-----------|
| better-sqlite3 over Prisma | Synchronous API correct for Server Actions; no 50MB binary |
| Drizzle ORM | TypeScript-native, thin, pairs well with better-sqlite3 |
| Server Actions for all mutations | Eliminates API route boilerplate; `revalidatePath` handles cache |
| URL as search/filter state | `SearchBar` + `TagFilter` push to URL params; no client state needed |
| All searchEntries branches use db.$client raw SQL | Enables test DB injection (Drizzle stores own session.client); FTS5 requires raw SQL anyway |
| Test DB injection patches db.$client AND db.session.client | Drizzle query builder uses session.client independently; both must be swapped for in-memory isolation |
| FTS5 content table + triggers | Sync FTS index on INSERT/UPDATE/DELETE at schema creation time |
| globalThis DB singleton | Survives HMR re-evaluation; prevents multiple connections |
| `process.cwd()` for DB path | Consistent in dev and build; never use `__dirname` |
| react-markdown over marked/markdown-it | No `dangerouslySetInnerHTML`; React elements |
| `@uiw/react-md-editor` via `dynamic()` ssr:false | Markdown-native raw string I/O; avoids SSR issues |

### Phase 1 Critical Pitfalls (address Day 1)

- `serverExternalPackages: ['better-sqlite3']` in `next.config.js` — required or build fails
- `global.__db` singleton — required or HMR creates leaked connections
- `path.join(process.cwd(), 'journal.db')` — never `__dirname`
- FTS5 triggers created at schema init — content table stays in sync

### Open Questions

- ~~Co-locate `journal.db` in project root or `.data/` directory?~~ **RESOLVED** → `.data/journal.db` (D-01)
- ~~`drizzle-kit push` vs `drizzle-kit generate` + migrate~~ **RESOLVED** → `drizzle-kit push` (D-03)
- Exact autosave debounce value: 150–500ms range, validate by feel (Phase 3)
- `@uiw/react-md-editor` dark mode with Tailwind v4 CSS variables — untested combination (Phase 3)

---

## Blockers

None.

---

## Session Continuity

**Roadmap created:** 2026-05-21
**Phase 1 planned:** 2026-05-22
**Phase 1 complete:** 2026-05-22
**Phase 2 planned:** 2026-05-25
**Phase 2 complete:** 2026-05-25
**Phase 3 planned:** 2026-05-26
**Phase 3 complete:** 2026-05-26
**Phase 4 plan 01 complete:** 2026-05-27
**Phase 4 plan 02 complete:** 2026-05-27
**Phase 4 plan 03 complete:** 2026-05-27
**v1 complete:** 2026-05-27
**Next action:** All v1 plans complete — Dev Journal v1 feature-complete

---
*State initialized: 2026-05-21 during roadmap creation*
