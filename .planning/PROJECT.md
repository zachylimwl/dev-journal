# Dev Journal

## What This Is

A personal web app built in Next.js for writing daily developer journal entries. You write free-form Markdown entries, tag them by project, and search or filter past entries to find what you worked on and learned. Single-user, no login, runs locally.

## Core Value

A fast place to write and later find anything you've worked on — entries should be writable in seconds and searchable in seconds.

**Core Value check (v1.0 close):** Still the right priority. Both halves are delivered — write loop has autosave so you never need to hit Save, and search is FTS5-powered and debounced so results appear as you type.

## Requirements

### Validated (v1.0)

- [x] User can create, edit, and delete journal entries *(Phase 3)*
- [x] Entries support free-form Markdown with metadata (tags, date) *(Phase 3)*
- [x] Entries can be tagged with one or more project tags, normalized automatically *(Phase 3)*
- [x] Entries render as formatted Markdown with syntax highlighting *(Phase 2)*
- [x] User can full-text search across all entries (FTS5, BM25-ranked, debounced) *(Phase 4)*
- [x] User can filter entries by tag/project *(Phase 4)*
- [x] User can combine text search and tag filter *(Phase 4)*

### Active (v2 candidates)

- [ ] Search result snippets highlight matched text (V2-SRCH-01)
- [ ] Tag autocomplete when typing a new tag (V2-SRCH-02)
- [ ] Entry timeline / calendar view (V2-VIEW-01)
- [ ] Export entries to Markdown files (V2-EXPO-01)
- [ ] Writing streak tracker (V2-STAT-01)

### Out of Scope

- Authentication / login — single-user local app, no auth needed *(still valid)*
- Multi-user support — personal tool only *(still valid)*
- Cloud deployment — runs on localhost only *(still valid for v1; revisit for v2)*
- Rich text / WYSIWYG editor — Markdown is preferred *(still valid)*
- File / image attachments — adds storage complexity *(still valid)*
- Nested tags or tag hierarchy — flat tags + FTS eliminates need *(still valid)*
- Revision history — disproportionate complexity for solo use *(still valid)*
- Dark mode — deferred *(revisit for v2)*

## Context

- Built as a personal developer tool for daily use
- Next.js 16.2.6 app with local SQLite storage — `better-sqlite3` + Drizzle ORM + FTS5
- Runs on localhost via `npm run dev` — no deployment target for v1
- 33-test Vitest suite covers tag normalization, Server Actions, and FTS5 search branches
- DB file at `.data/journal.db` (gitignored)

## Constraints

- **Tech Stack**: Next.js + SQLite — keep it local and dependency-light
- **Deployment**: localhost only for v1 — no server/cloud requirements
- **Auth**: None — single user, private machine

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite for storage | Local-only app, no external DB deps, simple file-based persistence | ✓ Validated in Phase 1 |
| No authentication | Single-user personal tool on localhost | ✓ Validated in Phase 1 |
| Next.js 16.2.6 (App Router) | User's chosen framework | ✓ Validated in Phase 1 |
| better-sqlite3 over sqlite3/Prisma | Sync API correct for Server Actions; fastest Node.js SQLite driver | ✓ Validated in Phase 1 |
| Drizzle ORM + drizzle-kit push | Thin TypeScript-native ORM, no binary engine; push workflow ideal for local dev | ✓ Validated in Phase 1 |
| Server Actions over API Routes | App Router standard for mutations; no boilerplate | ✓ Validated in Phase 1 |
| FTS5 virtual table + triggers | Built into SQLite; zero deps; BM25 ranking; empty-query guard required | ✓ Validated in Phase 4 |
| globalThis DB singleton | Prevents HMR connection leaks in Next.js dev | ✓ Validated in Phase 1 |
| `@uiw/react-md-editor` via dynamic() ssr:false | Markdown-native raw string I/O; clean Next.js integration | ✓ Validated in Phase 3 |
| react-markdown over marked | React elements, no dangerouslySetInnerHTML; remark/rehype plugin ecosystem | ✓ Validated in Phase 2 |
| URL as search/filter state | searchParams-driven Server Component re-render; no client state needed | ✓ Validated in Phase 4 |
| Two-query FTS5 tag retrieval | FTS5 gives IDs; second query fetches tags via IN(); merge with Map pattern | ✓ Validated in Phase 4 |

---

## Current State

**v1.0 shipped (2026-05-27)** — All 4 phases and 12/12 v1 requirements delivered. App is daily-usable: write Markdown entries with autosave, tag by project, search by keyword and tag simultaneously. `npm run dev` + open http://localhost:3000.

**Stack:** Next.js 16.2.6 + TypeScript + better-sqlite3 + Drizzle ORM + Tailwind CSS v4 + shadcn/ui + react-markdown + @uiw/react-md-editor + SQLite FTS5

**Tests:** 33 Vitest tests — `npm run test`

**Next milestone candidates:** v2 search enhancements (snippet highlighting, tag autocomplete), calendar view, export, dark mode

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Created: 2026-05-21*
*Last updated: 2026-05-27 — v1.0 milestone close*
