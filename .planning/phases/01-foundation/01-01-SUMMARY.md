---
phase: 01-foundation
plan: 01
subsystem: scaffold-and-db
tags: [nextjs, sqlite, drizzle, better-sqlite3, fts5, tailwind, typescript]
dependency_graph:
  requires: []
  provides:
    - Next.js App Router scaffold with TypeScript and Tailwind
    - better-sqlite3 globalThis singleton with WAL mode and foreign keys
    - Drizzle ORM schema (entries, tags, entryTags)
    - FTS5 virtual table + 3 sync triggers (auto-init on first import)
    - drizzle-kit config for push workflow
  affects:
    - All subsequent plans (Phase 2+ build on this foundation)
tech_stack:
  added:
    - next@16.2.6
    - react@19.x
    - typescript@5.x
    - tailwindcss@4.3.0
    - better-sqlite3@12.10.0
    - drizzle-orm@0.45.2
    - drizzle-kit@0.31.10
    - "@types/better-sqlite3@7.6.13"
  patterns:
    - globalThis.__db singleton for HMR-safe DB connection
    - serverExternalPackages to prevent webpack bundling of native addon
    - FTS5 content table + triggers for zero-configuration search sync
    - CREATE TABLE IF NOT EXISTS in initSchema for zero-config startup
key_files:
  created:
    - path: package.json
      purpose: Project dependencies including better-sqlite3, drizzle-orm, drizzle-kit
    - path: next.config.ts
      purpose: serverExternalPackages config preventing webpack bundling of better-sqlite3
    - path: tsconfig.json
      purpose: "@/* path alias pointing to src/"
    - path: .gitignore
      purpose: Excludes .data/*.db from version control
    - path: src/lib/db/schema.ts
      purpose: Drizzle ORM table definitions — entries, tags, entryTags
    - path: src/lib/db/index.ts
      purpose: globalThis DB singleton + full schema auto-init (tables + FTS5 + triggers)
    - path: drizzle.config.ts
      purpose: drizzle-kit push configuration pointing to .data/journal.db
    - path: src/app/layout.tsx
      purpose: Root layout (scaffolded by create-next-app, unmodified)
    - path: src/app/page.tsx
      purpose: Home page placeholder (scaffolded by create-next-app, unmodified)
  modified: []
decisions:
  - "FTS5 virtual table defined exclusively in initSchema() raw SQL (not schema.ts) — Drizzle has no virtual table type"
  - "globalThis.__db pattern chosen over module-level const — survives Next.js HMR re-evaluation"
  - "serverExternalPackages at top level of NextConfig (not experimental) — renamed in Next.js 14.1"
  - "process.cwd() used for DB path (not __dirname) — __dirname resolves to .next/server/ in production build"
  - "fs.mkdirSync with recursive:true called before new Database() — better-sqlite3 does not auto-create parent directories"
metrics:
  duration: "239s (~4 minutes)"
  completed_date: "2026-05-22T10:35:40Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 2
requirements_fulfilled:
  - SC-1
  - SC-2
  - SC-4
---

# Phase 1 Plan 01: Next.js Scaffold + SQLite DB Layer Summary

**One-liner:** Next.js 16 scaffold with better-sqlite3 globalThis singleton, Drizzle ORM schema (entries/tags/entryTags), and FTS5 virtual table auto-initialized via raw SQL on first import.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Scaffold Next.js project and configure for better-sqlite3 | 8fc12f6 | package.json, next.config.ts, tsconfig.json, .gitignore, src/app/* |
| 2 | Build DB layer — schema, singleton, and drizzle-kit config | c77734f | src/lib/db/schema.ts, src/lib/db/index.ts, drizzle.config.ts |

## Verification Results

- `npm run build` exits code 0 — SC-1 and SC-3 satisfied
- `npx tsc --noEmit` exits clean — TypeScript compiler reports no errors
- `next.config.ts` contains `serverExternalPackages: ['better-sqlite3']` at top level — SC-3
- `src/lib/db/index.ts` uses `globalThis.__db` check — SC-4 (HMR singleton)
- `src/lib/db/schema.ts` exports `entries`, `tags`, `entryTags` — Drizzle table types
- `drizzle.config.ts` at project root with dialect, schema path, and DB URL — D-03 prerequisite
- `.data/` directory exists at project root — ready for DB file creation on first import
- DB path uses `process.cwd()` not `__dirname` — prevents production path break

## Deviations from Plan

None — plan executed exactly as written.

The one operational note: `create-next-app` cannot scaffold into a directory containing existing files (`.planning/`, `CLAUDE.md`). Workaround: scaffolded into `/tmp/dev-journal-scaffold/`, then rsync'd all files (excluding `.git`, `.next`, `node_modules`, `CLAUDE.md`) into the worktree root. This is equivalent to a direct scaffold — all generated files are identical.

## Known Stubs

None. No UI components or data sources in this plan — it is purely infrastructure.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond what was defined in the plan's threat model.

## Self-Check: PASSED

- [x] src/lib/db/schema.ts exists and contains entries, tags, entryTags exports
- [x] src/lib/db/index.ts exists and exports db via drizzle(getDb(), { schema })
- [x] drizzle.config.ts exists at project root
- [x] next.config.ts contains serverExternalPackages: ['better-sqlite3']
- [x] tsconfig.json contains "@/*": ["./src/*"]
- [x] .gitignore contains .data/*.db
- [x] Commit 8fc12f6 exists (Task 1)
- [x] Commit c77734f exists (Task 2)
- [x] npm run build exits 0
- [x] npx tsc --noEmit exits 0
