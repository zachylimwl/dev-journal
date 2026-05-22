# Walking Skeleton — Dev Journal

**Phase:** 1
**Generated:** 2026-05-22

## Capability Proven End-to-End

A developer runs `npm run dev`, the Next.js app serves a page, and that page's Server Action import triggers automatic SQLite database creation at `.data/journal.db` with the full schema (entries, tags, entry_tags, FTS5 virtual table, and three sync triggers) — proving scaffold, routing, DB layer, and Server Action wiring all work together.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.2.6 — App Router, TypeScript, `src/` dir | User's locked choice; App Router + Server Actions is the current standard; `src/` keeps config files clean at root |
| Data layer | better-sqlite3 12.10.0 + Drizzle ORM 0.45.2 | Synchronous API correct for Server Actions; thin ORM with no binary engine; correct for a local single-user tool |
| DB file location | `.data/journal.db` | Keeps data out of project root; `.gitignore` entry `.data/*.db` lets future seed files live under `.data/` |
| Schema init strategy | `CREATE TABLE IF NOT EXISTS` raw SQL on first import of `db/index.ts` | Zero-config startup — `npm run dev` just works without any CLI step; FTS5 and triggers are not representable in Drizzle schema so raw SQL is required anyway |
| HMR safety | `globalThis.__db` singleton | `globalThis` survives HMR module re-evaluation; prevents duplicate DB connections in dev |
| Migration workflow | `drizzle-kit push` (no versioned files) | Correct for a single-developer local-only app; `push` computes diff and applies it without generating migration history |
| Auth | None | Single-user app on localhost; no login needed |
| Deployment target | `localhost` only (v1) | Personal tool; no server or cloud requirements for v1 |
| Directory layout | `src/app/` for routes, `src/lib/db/` for DB layer, `src/lib/actions.ts` for all Server Actions | Follows Next.js App Router conventions; `@/` alias points to `src/` for clean imports |
| Styling | Tailwind CSS v4.3.0 + shadcn/ui | Scaffolded by `create-next-app`; used in Phase 2+ for UI |

## Stack Touched in Phase 1

- [x] Project scaffold (Next.js, TypeScript, Tailwind, ESLint, App Router, `src/` dir)
- [x] Routing — `src/app/page.tsx` (home route, placeholder content)
- [x] Database — full schema auto-created on first Server Action import (read + write paths established via Drizzle types)
- [x] UI — `src/app/page.tsx` imports from `src/lib/actions.ts` (Server Action wired to page)
- [x] Deployment — `npm run dev` local full-stack run; `npm run build` smoke test

## Out of Scope (Deferred to Later Slices)

- Entry list rendering and Markdown display (Phase 2 — Read Loop)
- Entry creation, editing, deletion, autosave (Phase 3 — Write Loop)
- Tag management (Phase 3 — Write Loop)
- FTS5 keyword search and tag filter UI (Phase 4 — Search & Filter)
- Dark mode, export, stats, revision history (v2 backlog)
- Any form of authentication or multi-user support (out of scope for v1)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering the architectural decisions above:

- Phase 2: Browse and read all entries with fully rendered Markdown (Read Loop)
- Phase 3: Create, edit, delete, and tag entries with autosave (Write Loop)
- Phase 4: FTS5 keyword search, tag filter, and combined query (Search & Filter)
