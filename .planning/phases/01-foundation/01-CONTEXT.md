# Phase 1: Foundation - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

A working Next.js scaffold with a SQLite data layer — DB connection, schema, FTS5 virtual table, and Server Actions stub that compile and smoke-test cleanly. Nothing user-visible. Enables all subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### DB File Location
- **D-01:** Database file lives at `.data/journal.db` — not the project root.
- **D-02:** `.gitignore` entry is `.data/*.db` (not the whole `.data/` directory) — leaves room to commit seed files or fixtures under `.data/` in the future.

### Migration Strategy
- **D-03:** Use `drizzle-kit push` for schema tooling and introspection — no versioned migration files generated.
- **D-04:** The DB module auto-inits the full schema (`CREATE TABLE IF NOT EXISTS` + FTS5 virtual table + triggers) via raw SQL on first import of the globalThis singleton. No manual CLI step or npm script required on first run — `npm run dev` just works.

### Project Layout
- **D-05:** Use `src/` directory convention — all app code lives under `src/`, config files at root.
- **D-06:** Internal structure:
  - `src/lib/db/index.ts` — globalThis DB singleton + schema auto-init
  - `src/lib/db/schema.ts` — Drizzle ORM schema definitions
  - `src/lib/actions.ts` — all Server Actions
- **D-07:** Configure `@/` TypeScript path alias pointing to `src/`. Use `@/lib/db` instead of relative paths throughout.

### Claude's Discretion
No "you decide" items — all gray areas were resolved by the user.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and phase dependencies
- `.planning/REQUIREMENTS.md` — v1 requirements (VIEW, ENTR, TAG, SRCH) — Phase 1 enables all of them
- `.planning/STATE.md` — Accumulated key decisions from research + Phase 1 critical pitfalls (MUST READ)

### Tech Stack Decisions
- `CLAUDE.md` — Full tech stack rationale, version pins, what NOT to use, and key decision explanations (better-sqlite3, Drizzle, Server Actions, FTS5)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code.

### Established Patterns
- None yet — Phase 1 establishes the patterns all subsequent phases follow.

### Integration Points
- Phase 1 creates the DB singleton and Server Actions stub that Phase 2 (Read Loop), Phase 3 (Write Loop), and Phase 4 (Search & Filter) build on top of.

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond decisions above — open to standard Next.js 15 App Router patterns within the locked tech stack.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-05-22*
