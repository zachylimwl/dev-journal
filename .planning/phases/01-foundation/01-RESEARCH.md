# Phase 1: Foundation - Research

**Researched:** 2026-05-22
**Domain:** Next.js App Router scaffold + SQLite data layer (better-sqlite3 + Drizzle ORM)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Database file lives at `.data/journal.db` — not the project root.
- **D-02:** `.gitignore` entry is `.data/*.db` (not the whole `.data/` directory).
- **D-03:** Use `drizzle-kit push` for schema tooling and introspection — no versioned migration files generated.
- **D-04:** The DB module auto-inits the full schema (`CREATE TABLE IF NOT EXISTS` + FTS5 virtual table + triggers) via raw SQL on first import of the globalThis singleton. No manual CLI step or npm script required on first run.
- **D-05:** Use `src/` directory convention — all app code lives under `src/`, config files at root.
- **D-06:** Internal structure:
  - `src/lib/db/index.ts` — globalThis DB singleton + schema auto-init
  - `src/lib/db/schema.ts` — Drizzle ORM schema definitions
  - `src/lib/actions.ts` — all Server Actions
- **D-07:** Configure `@/` TypeScript path alias pointing to `src/`. Use `@/lib/db` instead of relative paths throughout.

### Claude's Discretion

None — all gray areas were resolved by the user.

### Deferred Ideas (OUT OF SCOPE)

None.
</user_constraints>

---

## Summary

Phase 1 is a pure infrastructure phase on a completely greenfield project — only `CLAUDE.md` and `.planning/` exist. The entire Next.js scaffold must be created from scratch using `create-next-app`, then the DB layer added on top.

The core technical challenge is wiring `better-sqlite3` (a native Node.js addon) safely into the Next.js App Router build system. Two invariants must hold simultaneously: (1) the package must never be bundled by webpack (it requires native `.node` binaries), and (2) only one DB connection must exist across HMR module reloads in dev. Both have well-established patterns with no ambiguity.

The schema auto-init approach (D-04) is deliberate: Drizzle ORM handles TypeScript-typed queries, but the `CREATE TABLE IF NOT EXISTS` + FTS5 virtual table + sync triggers are emitted as raw SQL on first import. This gives zero-configuration startup (`npm run dev` just works) while keeping the FTS5 index always in sync via database-level triggers — no application-layer sync logic needed.

**Primary recommendation:** Scaffold with `create-next-app@latest` flags for TypeScript, Tailwind, App Router, and `src/` dir, then layer in `better-sqlite3`, `drizzle-orm`, and `drizzle-kit` with explicit `serverExternalPackages` config.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| DB connection management | API / Backend (Node.js Server) | — | better-sqlite3 is a native Node.js addon; cannot run in Edge or browser |
| Schema auto-init | API / Backend (Server Action / module init) | — | Runs at module import time in server context |
| FTS5 sync | Database / Storage (triggers) | — | Trigger-based sync happens at DB layer, not application layer |
| Server Actions scaffold | API / Backend | — | `'use server'` directive; Node.js runtime only |
| TypeScript path aliases | Build (tsconfig) | — | Compile-time only; no runtime tier |
| Drizzle schema types | Build (type generation) | API / Backend | Types used server-side; no client exposure |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.6 | App framework + build system | User's locked choice; App Router is current standard |
| react | 19.x (peer) | UI runtime | Bundled with Next.js 16 |
| typescript | 5.x | Type safety | Default in create-next-app; catches schema drift early |
| better-sqlite3 | 12.10.0 | SQLite driver | Synchronous API correct for Server Actions; fastest Node SQLite |
| drizzle-orm | 0.45.2 | Query builder + TypeScript schema | Thin, type-native; no binary engine; pairs with better-sqlite3 |
| drizzle-kit | 0.31.10 | Migration CLI (`push` workflow) | Generates/applies schema diffs without versioned files |
| @types/better-sqlite3 | 7.6.13 | TypeScript definitions for better-sqlite3 | Required for typed DB handle |

[VERIFIED: npm registry] — all versions confirmed via `npm view` on 2026-05-22; all packages confirmed via official documentation.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | 4.3.0 | Utility-first CSS | Scaffolded by create-next-app; used in later UI phases |
| eslint | bundled | Linting | Scaffolded by create-next-app; keep default config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | Prisma | Prisma adds 50 MB binary engine and daemon — pure cost for 2-table local app |
| better-sqlite3 | sqlite3 (node-sqlite3) | Async callback API adds event-loop overhead on CPU-bound work; slower |
| drizzle-kit push | drizzle-kit generate + migrate | generate creates versioned SQL files — unnecessary for single-developer local app |
| raw SQL schema init | drizzle-kit migration | Both are valid; raw SQL in init gives zero-config startup (D-04 decision) |

**Installation:**
```bash
# Scaffold (interactive prompts — use flags for non-interactive)
npx create-next-app@latest dev-journal --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# DB layer (run inside project directory)
npm install better-sqlite3 drizzle-orm
npm install -D drizzle-kit @types/better-sqlite3
```

**Version verification:** All versions above confirmed via `npm view <package> version` on 2026-05-22. [VERIFIED: npm registry]

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All packages below are tagged `[ASSUMED]` from a hallucination-risk perspective, but are well-established packages verified on the npm registry via `npm view` and official documentation.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| better-sqlite3 | npm | ~9 yrs (2016-09-07) | Very high | github.com/WiseLibs/better-sqlite3 | N/A | Approved — long-lived, official docs cite |
| drizzle-orm | npm | ~4 yrs (2021-09-10) | High | github.com/drizzle-team/drizzle-orm | N/A | Approved — official ORM docs, widely cited |
| drizzle-kit | npm | ~4 yrs (2021-09-10) | High | github.com/drizzle-team/drizzle-orm | N/A | Approved — same org as drizzle-orm |
| @types/better-sqlite3 | npm | DefinitelyTyped | Moderate | github.com/DefinitelyTyped | N/A | Approved — standard DefinitelyTyped package |
| next | npm | ~10 yrs | Very high (>5M/wk) | github.com/vercel/next.js | N/A | Approved — Vercel official framework |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. All packages above verified on npm registry via `npm view` and confirmed by official documentation (CLAUDE.md, orm.drizzle.team, nextjs.org). Risk of hallucination is low given all are referenced in official documentation.*

---

## Architecture Patterns

### System Architecture Diagram

```
[npm run dev]
      │
      ▼
[Next.js Dev Server (Node.js runtime)]
      │
      ├── [src/app/layout.tsx]  ← root layout (Tailwind globals)
      │
      └── [src/app/page.tsx]   ← home page (placeholder for Phase 2)
            │
            │  imports (server-side)
            ▼
      [src/lib/actions.ts]      ← 'use server' — Server Actions
            │
            │  imports on first call
            ▼
      [src/lib/db/index.ts]     ← globalThis singleton
            │
            ├── checks globalThis.__db
            ├── if undefined: new Database('.data/journal.db')
            │     └── runs initSchema() → raw SQL
            │           ├── CREATE TABLE IF NOT EXISTS entries
            │           ├── CREATE TABLE IF NOT EXISTS tags
            │           ├── CREATE TABLE IF NOT EXISTS entry_tags
            │           ├── CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(...)
            │           └── CREATE TRIGGER IF NOT EXISTS (insert/update/delete)
            └── returns db handle to drizzle(db)
                        │
                        ▼
              [src/lib/db/schema.ts]   ← Drizzle table definitions (TypeScript types)
                        │
                        ▼
              [.data/journal.db]       ← SQLite file (gitignored via .data/*.db)
```

### Recommended Project Structure
```
dev-journal/
├── .data/                   # gitignored (*.db) — DB file lives here
│   └── journal.db           # auto-created on first import
├── src/
│   ├── app/
│   │   ├── layout.tsx       # root layout, Tailwind globals
│   │   └── page.tsx         # home page placeholder
│   └── lib/
│       ├── db/
│       │   ├── index.ts     # globalThis singleton + schema auto-init
│       │   └── schema.ts    # Drizzle ORM table definitions
│       └── actions.ts       # all Server Actions ('use server')
├── drizzle.config.ts        # drizzle-kit configuration
├── next.config.ts           # Next.js config (serverExternalPackages)
├── tsconfig.json            # @/* → src/* path alias
├── .gitignore               # includes .data/*.db
└── package.json
```

### Pattern 1: globalThis DB Singleton
**What:** Store the `better-sqlite3` Database instance on `globalThis` so Next.js HMR module re-evaluation does not create duplicate connections.
**When to use:** Always — required in any Next.js dev environment using native Node.js addons.
**Example:**
```typescript
// src/lib/db/index.ts
// Source: Next.js HMR singleton pattern (nextjs.org/docs), better-sqlite3 docs
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function initSchema(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS entry_tags (
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
      PRIMARY KEY (entry_id, tag_id)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts
      USING fts5(title, body, content=entries, content_rowid=id);

    CREATE TRIGGER IF NOT EXISTS entries_fts_insert
      AFTER INSERT ON entries BEGIN
        INSERT INTO entries_fts(rowid, title, body)
          VALUES (new.id, new.title, new.body);
      END;

    CREATE TRIGGER IF NOT EXISTS entries_fts_update
      AFTER UPDATE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, body)
          VALUES ('delete', old.id, old.title, old.body);
        INSERT INTO entries_fts(rowid, title, body)
          VALUES (new.id, new.title, new.body);
      END;

    CREATE TRIGGER IF NOT EXISTS entries_fts_delete
      AFTER DELETE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, body)
          VALUES ('delete', old.id, old.title, old.body);
      END;
  `);
}

function getDb(): Database.Database {
  if (!globalThis.__db) {
    const dbPath = path.join(process.cwd(), '.data', 'journal.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    initSchema(sqlite);
    globalThis.__db = sqlite;
  }
  return globalThis.__db;
}

export const db = drizzle(getDb(), { schema });
```
[CITED: github.com/vercel/next.js HMR singleton pattern, better-sqlite3 API docs, SQLite FTS5 official docs]

### Pattern 2: Drizzle Schema Definition
**What:** Define SQLite tables in TypeScript using Drizzle's `sqliteTable` helpers. These types flow through to Server Actions and query results.
**When to use:** All table definitions live in `schema.ts`. Drizzle query builder uses these types.
**Example:**
```typescript
// src/lib/db/schema.ts
// Source: orm.drizzle.team/docs/get-started-sqlite
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const entries = sqliteTable('entries', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  title:     text('title').notNull().default(''),
  body:      text('body').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
               .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
               .$defaultFn(() => new Date()),
});

export const tags = sqliteTable('tags', {
  id:   integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const entryTags = sqliteTable('entry_tags', {
  entryId: integer('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  tagId:   integer('tag_id').notNull().references(() => tags.id,    { onDelete: 'cascade' }),
});
```
[CITED: orm.drizzle.team/docs/column-types/sqlite]

### Pattern 3: Server Actions Scaffold
**What:** Stub Server Actions in `actions.ts` so later phases can implement without restructuring.
**When to use:** All mutations use Server Actions in this project (D-06).
**Example:**
```typescript
// src/lib/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { entries } from '@/lib/db/schema';

// Stub — implemented in Phase 3
export async function getEntries() {
  return db.select().from(entries).all();
}
```
[CITED: nextjs.org/docs/app/guides/mutating-data]

### Pattern 4: next.config.ts with serverExternalPackages
**What:** Prevent Next.js webpack from attempting to bundle `better-sqlite3` (a native addon that uses `require` at runtime).
**When to use:** Required — without this, `npm run build` fails with module not found or native addon errors.

**Important finding:** The built-in Next.js auto-opt-out list for `serverExternalPackages` does NOT include `better-sqlite3` (it includes `sqlite3`, not `better-sqlite3`). [CITED: nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages] Explicit config is required.

**Example:**
```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
```
[CITED: nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages]

### Pattern 5: drizzle.config.ts for drizzle-kit push
**What:** Configure `drizzle-kit` to know where the schema lives and which DB to push to.
**When to use:** Run `npx drizzle-kit push` after schema changes during development.
**Example:**
```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema:  './src/lib/db/schema.ts',
  dbCredentials: {
    url: '.data/journal.db',
  },
});
```
[CITED: orm.drizzle.team/docs/drizzle-kit-push, orm.drizzle.team/kit-docs/config-reference]

### Anti-Patterns to Avoid
- **Using `__dirname` for DB path:** `__dirname` resolves differently in development vs. build output. Always use `path.join(process.cwd(), '.data/journal.db')`. [VERIFIED: CLAUDE.md critical pitfalls]
- **Not using globalThis singleton:** Every HMR reload re-evaluates modules. Without `globalThis.__db`, each reload opens a new connection — SQLite allows this but leaks file handles and causes stale handle errors in dev.
- **Setting Edge runtime:** `export const runtime = 'edge'` in any file that imports the DB module — Edge runtime lacks Node.js APIs (`fs`, native addons). Never set this.
- **Importing DB in Client Components:** Any file with `'use client'` must never import from `@/lib/db`. Server-only.
- **Skipping `foreign_keys = ON` pragma:** SQLite does not enforce foreign keys by default. Without this pragma, cascade deletes won't fire and orphan rows accumulate.
- **FTS5 sync without triggers:** Manually syncing FTS in application code means any direct DB write (e.g., from drizzle-kit push) will leave the FTS index stale. Triggers at the DB layer are authoritative.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite full-text search | Custom LIKE query or JS filter | SQLite FTS5 built-in | FTS5 has BM25 ranking, prefix search, phrase queries; LIKE does full table scans with no index |
| FTS index sync | Application-layer sync code | FTS5 content table + triggers | Triggers fire on every write including direct DB writes; application code misses direct writes |
| DB singleton | Custom module-level cache | `globalThis.__db` pattern | globalThis survives HMR module re-evaluation; module-level variables don't |
| TypeScript row types | Manual interface definitions | Drizzle `InferSelectModel` / `InferInsertModel` | Drizzle infers types from schema; manual types drift |
| Migration versioning | Custom SQL migration files | drizzle-kit push | drizzle-kit push computes diff and applies it; correct for local single-dev workflow |

**Key insight:** The FTS5 content table + trigger pattern is the correct SQLite primitive for search sync. Any attempt to manage this in application code introduces sync bugs when data is modified by any path other than the application.

---

## Common Pitfalls

### Pitfall 1: better-sqlite3 Not in Built-in Opt-Out List
**What goes wrong:** Build fails with `Module not found` or native addon errors when `next build` runs, because webpack tries to bundle `better-sqlite3`.
**Why it happens:** The Next.js built-in `serverExternalPackages` auto-opt-out list includes `sqlite3` (node-sqlite3) but NOT `better-sqlite3`. Many tutorials omit the explicit config step.
**How to avoid:** Always add `serverExternalPackages: ['better-sqlite3']` to `next.config.ts` before any other work.
**Warning signs:** Build error mentioning `.node` file, `Cannot find module 'better-sqlite3'`, or `Module parse failed: Unexpected character`.
[CITED: nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages]

### Pitfall 2: HMR Creates Multiple DB Connections
**What goes wrong:** In dev (`npm run dev`), Next.js re-evaluates module files on every save. A module-level `const db = new Database(...)` creates a new connection on every reload.
**Why it happens:** HMR invalidates module cache; module-level constants are re-initialized. `globalThis` is NOT re-initialized between HMR cycles.
**How to avoid:** Use `globalThis.__db` as shown in Pattern 1. Check `if (!globalThis.__db)` before creating the connection.
**Warning signs:** Logs showing multiple DB init messages, `SQLITE_BUSY` errors after several saves, unexpected file locks.

### Pitfall 3: DB Path Breaks in Production Build
**What goes wrong:** `next build` output (`next start`) resolves `__dirname` to the compiled output directory, not the project root. DB file is not found.
**Why it happens:** `__dirname` in compiled Next.js server code points to `.next/server/`, not the project root.
**How to avoid:** Always use `path.join(process.cwd(), '.data/journal.db')`. `process.cwd()` is always the project root regardless of compiled location.
**Warning signs:** Works in dev, fails after `next build && next start`.

### Pitfall 4: FTS5 Virtual Table Reported as Missing by drizzle-kit
**What goes wrong:** `drizzle-kit push` shows FTS5 virtual table as unmanaged or reports drift warnings.
**Why it happens:** Drizzle ORM has no native type for SQLite virtual tables. FTS5 is not representable in `schema.ts`.
**How to avoid:** FTS5 table and triggers are created via raw `sqlite.exec(...)` in the init function, not through Drizzle schema. This is correct and intentional (D-04). Do not try to model FTS5 in `schema.ts`.
**Warning signs:** drizzle-kit push asking to drop/recreate `entries_fts` — answer NO and ignore warnings for this table.

### Pitfall 5: Importing DB Module in Client Components
**What goes wrong:** Build error `You're importing a component that needs "node:fs"` or similar Node.js-only module error.
**Why it happens:** Next.js bundles Client Components for the browser. `better-sqlite3` requires Node.js `fs` and native `.node` addons — neither available in the browser.
**How to avoid:** Never import `@/lib/db` or `@/lib/actions` in any `'use client'` component. Server Actions are called from Client Components via function references, not direct imports of the DB module.
**Warning signs:** Build error referencing `fs`, `path`, or `.node` in a client bundle.

### Pitfall 6: Missing `.data/` Directory on First Run
**What goes wrong:** `Database('.data/journal.db')` throws `SQLITE_CANTOPEN` because `.data/` doesn't exist.
**Why it happens:** `better-sqlite3` does not auto-create parent directories.
**How to avoid:** Call `fs.mkdirSync(path.dirname(dbPath), { recursive: true })` before creating the Database instance (shown in Pattern 1).
**Warning signs:** `Error: SQLITE_CANTOPEN: unable to open database file` on first run.

---

## Code Examples

### FTS5 Content Table + Triggers (raw SQL)
```sql
-- Source: sqlite.org/fts5.html (FTS5 content tables)
-- Create FTS5 as a content table mirroring 'entries'
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts
  USING fts5(title, body, content=entries, content_rowid=id);

-- INSERT trigger: add new row to FTS index
CREATE TRIGGER IF NOT EXISTS entries_fts_insert
  AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(rowid, title, body)
      VALUES (new.id, new.title, new.body);
  END;

-- UPDATE trigger: delete old entry, insert new (FTS5 doesn't support UPDATE)
CREATE TRIGGER IF NOT EXISTS entries_fts_update
  AFTER UPDATE ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, title, body)
      VALUES ('delete', old.id, old.title, old.body);
    INSERT INTO entries_fts(rowid, title, body)
      VALUES (new.id, new.title, new.body);
  END;

-- DELETE trigger: remove entry from FTS index
CREATE TRIGGER IF NOT EXISTS entries_fts_delete
  AFTER DELETE ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, title, body)
      VALUES ('delete', old.id, old.title, old.body);
  END;
```
[CITED: sqlite.org/fts5.html — FTS5 external content tables]

### FTS5 Query Pattern (for Phase 4 reference)
```typescript
// Source: SQLite FTS5 documentation — MATCH operator
// Used in Phase 4 — included here so planner knows the query shape
const results = db
  .select()
  .from(entries)
  .where(sql`entries.id IN (SELECT rowid FROM entries_fts WHERE entries_fts MATCH ${query + '*'})`)
  .all();
```
[ASSUMED] — exact Drizzle raw SQL syntax not verified against current Drizzle docs; functional pattern is correct.

### Drizzle Insert (typed)
```typescript
// Source: orm.drizzle.team/docs/get-started-sqlite
import { db } from '@/lib/db';
import { entries } from '@/lib/db/schema';

const result = db.insert(entries).values({
  title: 'My first entry',
  body:  '## Hello\n\nThis is a journal entry.',
}).returning().get();
// result is typed as typeof entries.$inferSelect
```
[CITED: orm.drizzle.team/docs/get-started-sqlite]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next.config.js` (JS) | `next.config.ts` (TypeScript) | Next.js 15+ | Type-safe config; use `import type { NextConfig }` |
| `experimental.serverComponentsExternalPackages` | `serverExternalPackages` (top-level) | Next.js 14.1+ | No longer nested under `experimental` |
| Prisma for local SQLite | better-sqlite3 + Drizzle | Ongoing shift | Avoids 50 MB binary engine for local-only apps |
| drizzle-kit migrate workflow | drizzle-kit push (for local dev) | Drizzle Kit 0.20+ | Push skips versioned files; correct for single-dev local iteration |
| `module.exports = nextConfig` | `export default nextConfig` | Next.js 15+ (ESM default) | Use ESM export in `next.config.ts` |

**Deprecated/outdated:**
- `experimental.serverComponentsExternalPackages`: Renamed to top-level `serverExternalPackages` in Next.js 14.1. Do not use the experimental key.
- `next.config.js` with CommonJS: `next.config.ts` with TypeScript is now the default from `create-next-app`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | FTS5 raw SQL query pattern `entries_fts MATCH ${query + '*'}` is the correct Drizzle sql`` usage | Code Examples | Low — pattern is functionally correct; exact Drizzle `sql` tag syntax may differ slightly. Phase 4 planner should verify against Drizzle docs. |
| A2 | `drizzle-kit push` ignores unmanaged virtual tables without error (only warns) | Pitfall 4 | Medium — if drizzle-kit push errors on FTS5 table, the workaround is to add it to `tablesFilter` exclusion in drizzle.config.ts |
| A3 | `create-next-app@latest` scaffolds with Tailwind v4 by default when `--tailwind` flag is used | Standard Stack / Install | Low — CLAUDE.md confirms Tailwind 4.3.0 is the target version |

---

## Open Questions

1. **drizzle-kit push behavior with FTS5 virtual table**
   - What we know: Drizzle ORM has no native virtual table type. FTS5 table is created via raw SQL, not schema.ts.
   - What's unclear: Whether `drizzle-kit push` silently ignores unrecognized virtual tables or reports an error.
   - Recommendation: Plan should include a verification step — run `npx drizzle-kit push` after schema init and document the output. If it errors, add `tablesFilter: ['!entries_fts']` to `drizzle.config.ts`.

2. **Turbopack vs webpack for dev**
   - What we know: Next.js 16 enables Turbopack by default for `next dev`.
   - What's unclear: Whether `serverExternalPackages` is honored by Turbopack dev server exactly as it is by webpack.
   - Recommendation: Test `npm run dev` first; if native addon errors appear with Turbopack, add `--no-turbopack` flag to the dev script as a fallback.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js, better-sqlite3 | Yes | v24.1.0 | — |
| npm | Package installation | Yes | 11.3.0 | — |
| Git | Version control | Yes | (git repo exists) | — |
| SQLite3 binary | better-sqlite3 native build | Likely bundled | System SQLite | better-sqlite3 ships its own SQLite; no system install needed |

**Node.js v24.1.0 meets Next.js 16 requirement of >=20.9.0.** [VERIFIED: npm registry — `npm view next engines`]

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**Greenfield note:** No existing Next.js scaffold, `package.json`, `src/` directory, or `next.config` file exists. Phase 1 creates all of these from scratch.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None scaffolded yet — Phase 1 creates the project |
| Config file | none — Phase 1 does not include a testing framework |
| Quick run command | `npm run build` (smoke test — verifies bundling succeeds) |
| Full suite command | `npm run build && node -e "require('./.next/server/app/page.js')"` |

### Phase Requirements → Test Map

Phase 1 has no user-facing requirements. Validation maps to the four Phase 1 success criteria from ROADMAP.md:

| Criterion | Behavior | Test Type | Automated Command | Notes |
|-----------|----------|-----------|-------------------|-------|
| SC-1 | `npm run dev` starts, `next build` succeeds | smoke | `npm run build` | Manual: `npm run dev` and observe no errors |
| SC-2 | DB file created with correct schema on first run | smoke | Node.js inline script (see Wave 0) | Inspects journal.db after startup |
| SC-3 | better-sqlite3 reachable — no import/bundle errors | smoke | `npm run build` | Build failure = SC-3 failure |
| SC-4 | HMR does not create multiple connections | manual | Observe dev server logs | Touch a file, check no duplicate "DB init" logs |

### Sampling Rate
- **Per task commit:** `npm run build` (verifies bundling, SC-1 and SC-3)
- **Per wave merge:** `npm run build` + DB schema inspection script
- **Phase gate:** All 4 success criteria verified before moving to Phase 2

### Wave 0 Gaps
- [ ] DB schema inspection script (inline Node.js) — covers SC-2:
  ```bash
  node -e "
    const db = require('better-sqlite3')('.data/journal.db');
    const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' OR type='trigger'\").all();
    console.log(tables);
  "
  ```
- [ ] No testing framework needed for Phase 1 — smoke tests via build and manual dev server observation are sufficient.

---

## Security Domain

> `security_enforcement` not explicitly set to false in config.json — including this section.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A — single-user, no login |
| V3 Session Management | No | N/A — no sessions |
| V4 Access Control | No | N/A — localhost only |
| V5 Input Validation | Partial | Drizzle parameterized queries (auto-escapes values) |
| V6 Cryptography | No | No secrets or encrypted data in Phase 1 |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via FTS5 MATCH | Tampering | Always pass user input as a parameterized value to `sql` tag, never string-concatenate into raw SQL |
| Path traversal in DB path | Tampering | DB path is hardcoded (`process.cwd() + '/.data/journal.db'`) — no user input in path |
| Native addon supply chain | Tampering | better-sqlite3 is 9 years old with 50M+ weekly downloads and a well-known maintainer (WiseLibs) |

**Note:** This is a localhost single-user app. The security surface is minimal. The primary concern is SQL injection in search queries (Phase 4) — always use parameterized queries, never string interpolation into raw SQL.

---

## Sources

### Primary (HIGH confidence)
- [nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) — `serverExternalPackages` config option, built-in opt-out list verification
- [orm.drizzle.team/docs/get-started-sqlite](https://orm.drizzle.team/docs/get-started-sqlite) — Drizzle + better-sqlite3 initialization pattern
- [orm.drizzle.team/docs/drizzle-kit-push](https://orm.drizzle.team/docs/drizzle-kit-push) — drizzle-kit push workflow
- [orm.drizzle.team/kit-docs/config-reference](https://orm.drizzle.team/kit-docs/config-reference) — drizzle.config.ts schema
- [sqlite.org/fts5.html](https://sqlite.org/fts5.html) — FTS5 content table + trigger pattern
- [CLAUDE.md](./CLAUDE.md) — locked tech stack, version pins, critical pitfalls, key decision rationale
- npm registry (`npm view` on 2026-05-22) — version verification for all packages

### Secondary (MEDIUM confidence)
- [nextjs.org/docs/app/getting-started/installation](https://nextjs.org/docs/app/getting-started/installation) — `create-next-app` flags
- [github.com/vercel/next.js HMR singleton discussion](https://github.com/vercel/next.js/discussions/68572) — globalThis singleton pattern for dev HMR
- [simonh.uk SQLite FTS5 Triggers](https://simonh.uk/2021/05/11/sqlite-fts5-triggers/) — trigger pattern cross-reference

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via `npm view`; official docs consulted for all packages
- Architecture: HIGH — patterns are well-established; globalThis singleton is canonical Next.js pattern
- Pitfalls: HIGH — `serverExternalPackages` finding (better-sqlite3 NOT in built-in list) verified via official docs; remaining pitfalls confirmed by multiple sources

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (stable ecosystem — Next.js and Drizzle release frequently but these patterns are stable)
