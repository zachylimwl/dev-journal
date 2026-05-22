# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 1-Foundation
**Areas discussed:** DB file location, Migration strategy, Project layout

---

## DB File Location

| Option | Description | Selected |
|--------|-------------|----------|
| Project root | journal.db next to package.json — simple, obvious, easy to find | |
| .data/ subdirectory | .data/journal.db — keeps root clean, conventional 'hidden data' pattern | ✓ |

**User's choice:** `.data/` subdirectory

### .gitignore scope

| Option | Description | Selected |
|--------|-------------|----------|
| .data/ (whole directory) | Excludes everything in .data/ | |
| .data/*.db (just the DB) | Leaves room to track other .data/ files (e.g. seeds, fixtures) | ✓ |

**User's choice:** `.data/*.db`
**Notes:** User wants flexibility to commit seed files or fixtures under `.data/` in the future.

---

## Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| drizzle-kit push | Schema sync directly from TypeScript — no migration files | ✓ |
| drizzle-kit generate + migrate | Versioned SQL migration files tracked in git | |

**User's choice:** `drizzle-kit push`

### Auto-init on first run

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-init in DB module | globalThis singleton runs CREATE TABLE IF NOT EXISTS on first import | ✓ |
| npm predev script | package.json predev runs drizzle-kit push before dev server starts | |
| You decide | Let planner/researcher figure out approach | |

**User's choice:** Auto-init in DB module
**Notes:** Schema (tables + FTS5 virtual table + triggers) created via raw SQL in the DB singleton on first import. No manual step needed — `npm run dev` just works.

---

## Project Layout

### src/ directory

| Option | Description | Selected |
|--------|-------------|----------|
| app/ at root (no src/) | app/, lib/, components/ at project root — shallower imports | |
| src/ directory | Everything under src/ — keeps root clean (config vs source separation) | ✓ |

**User's choice:** `src/` directory

### Internal structure

| Option | Description | Selected |
|--------|-------------|----------|
| src/lib/db/ | src/lib/db/index.ts + schema.ts, src/lib/actions.ts | ✓ |
| src/app/_lib/ | Co-located inside app directory | |
| Flat src/db/ + src/actions/ | Minimal nesting, works for 2-3 files | |

**User's choice:** `src/lib/db/` structure

### TypeScript path aliases

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, @/ alias | import from '@/lib/db' — standard Next.js convention | ✓ |
| Relative imports only | Always use relative paths | |

**User's choice:** `@/` alias → `src/`

---

## Claude's Discretion

None — all gray areas were resolved by the user.

## Deferred Ideas

None — discussion stayed within Phase 1 scope.
