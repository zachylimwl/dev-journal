# Project State: Dev Journal

**Last updated:** 2026-05-21
**Session:** Roadmap creation

---

## Project Reference

**Core Value:** A fast place to write and later find anything you've worked on — entries writable in seconds and searchable in seconds

**Stack:** Next.js (App Router) + TypeScript + better-sqlite3 + Drizzle ORM + Tailwind CSS v4 + shadcn/ui + react-markdown + SQLite FTS5

**Run:** `npm run dev` — localhost only, no deployment target for v1

---

## Current Position

**Current Phase:** 1 — Foundation
**Current Plan:** None (not yet started)
**Status:** Not started

```
Progress: [          ] 0%
Phase 1 [    ] → Phase 2 [    ] → Phase 3 [    ] → Phase 4 [    ]
```

---

## Phase Map

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | Not started |
| 2 | Read Loop | Not started |
| 3 | Write Loop | Not started |
| 4 | Search & Filter | Not started |

---

## Accumulated Context

### Key Decisions (from research)

| Decision | Rationale |
|----------|-----------|
| better-sqlite3 over Prisma | Synchronous API correct for Server Actions; no 50MB binary |
| Drizzle ORM | TypeScript-native, thin, pairs well with better-sqlite3 |
| Server Actions for all mutations | Eliminates API route boilerplate; `revalidatePath` handles cache |
| URL as search/filter state | `SearchBar` + `TagFilter` push to URL params; no client state needed |
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

- Co-locate `journal.db` in project root or `.data/` directory? (affects `.gitignore`)
- `drizzle-kit push` vs `drizzle-kit generate` + migrate — decide in Phase 1
- Exact autosave debounce value: 150–500ms range, validate by feel
- `@uiw/react-md-editor` dark mode with Tailwind v4 CSS variables — untested combination

---

## Blockers

None.

---

## Session Continuity

**Roadmap created:** 2026-05-21
**Next action:** `/gsd:plan-phase 1` to plan Phase 1 (Foundation)

---
*State initialized: 2026-05-21 during roadmap creation*
