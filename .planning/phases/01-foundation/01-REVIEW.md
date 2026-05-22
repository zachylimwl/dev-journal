---
phase: 01-foundation
reviewed: 2026-05-22T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - .gitignore
  - drizzle.config.ts
  - eslint.config.mjs
  - next.config.ts
  - package.json
  - postcss.config.mjs
  - src/app/globals.css
  - src/app/layout.tsx
  - src/app/page.tsx
  - src/lib/actions.ts
  - src/lib/db/index.ts
  - src/lib/db/schema.ts
  - tsconfig.json
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-05-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 1 establishes the walking skeleton: Next.js 16 + SQLite via better-sqlite3 + Drizzle ORM + FTS5 full-text search. The architectural decisions are sound — `serverExternalPackages` is correctly set, the globalThis HMR singleton is correctly implemented, WAL mode and foreign keys are correctly pragmaed, and the FTS5 content-table triggers follow the correct delete-then-reinsert pattern for UPDATE. No critical/security issues were found.

Four warnings were identified: an unused import that will cause a lint error once lint runs, a missing `.gitignore` entry for WAL auxiliary files, a composite primary key absent from the Drizzle schema for the junction table, and the `eslint` script missing a target path. Three informational items cover a redundant ternary, an unnecessary `async` on a synchronous function, and stale scaffold metadata.

---

## Warnings

### WR-01: Unused import `revalidatePath` in actions.ts will fail strict lint

**File:** `src/lib/actions.ts:8`
**Issue:** `revalidatePath` is imported from `next/cache` but never called. The file comment says "call `revalidatePath` after mutations" but phase 1 has no mutations, leaving the import dead. With `eslint-config-next` and `no-unused-vars` enabled, this will produce a lint error when `npm run lint` is executed.
**Fix:** Remove the import until a mutation action is added:
```ts
// Remove this line:
import { revalidatePath } from 'next/cache';
// Add it back in the specific mutation action that needs it.
```

---

### WR-02: WAL auxiliary files not ignored — SQLite WAL/SHM files can be accidentally committed

**File:** `.gitignore:44`
**Issue:** The gitignore pattern `.data/*.db` covers only the main database file. SQLite in WAL mode (`journal_mode = WAL`, set in `db/index.ts:67`) also creates `journal.db-wal` and `journal.db-shm` alongside the database. These files are not matched by `*.db` and will appear as untracked files. If committed, they encode partial transaction state and can corrupt the database on checkout by other tools.
**Fix:** Extend the `.gitignore` block:
```gitignore
# local database files
.data/*.db
.data/*.db-wal
.data/*.db-shm
```

---

### WR-03: `entryTags` Drizzle schema is missing the composite primary key

**File:** `src/lib/db/schema.ts:26-29`
**Issue:** The raw SQL in `initSchema()` (`db/index.ts:35`) creates `entry_tags` with `PRIMARY KEY (entry_id, tag_id)`, preventing duplicate tag assignments to an entry. The Drizzle schema definition for `entryTags` declares both columns but omits `.primaryKey()`. This means Drizzle-generated INSERT statements will not be flagged at the ORM type level for duplicates, and `drizzle-kit push` may attempt to alter the table (dropping or ignoring the composite PK) since it sees a mismatch between the schema definition and the live DB.
**Fix:** Add the composite primary key to the Drizzle schema:
```ts
import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';

export const entryTags = sqliteTable('entry_tags', {
  entryId: integer('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  tagId:   integer('tag_id').notNull().references(() => tags.id,    { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.entryId, t.tagId] }),
}));
```

---

### WR-04: `npm run lint` lints nothing — `eslint` script missing target path

**File:** `package.json:9`
**Issue:** The lint script is `"eslint"` with no path argument. In ESLint 9 flat-config mode, running `eslint` without a target silently lints zero files (or errors with "No files matching the pattern"). The intent is to lint the `src/` directory.
**Fix:**
```json
"lint": "eslint src/"
```
Or, to match the Next.js convention of also linting config files:
```json
"lint": "next lint"
```
(`next lint` wraps ESLint with correct Next.js defaults and path targeting.)

---

## Info

### IN-01: `getEntries` declared `async` but body is fully synchronous

**File:** `src/lib/actions.ts:13`
**Issue:** `better-sqlite3` has a synchronous API. `db.select().from(entries).all()` returns `Entry[]` directly. Declaring the function `async` is misleading — it wraps the result in a `Promise` unnecessarily, causing a microtask tick on every call. The caller in `page.tsx` correctly `await`s it, so there is no functional bug in phase 1, but as mutation actions are added the pattern may confuse contributors.
**Fix:** Either keep `async` as a consistent convention for the Server Actions module (acceptable), or remove it since the body is sync:
```ts
export function getEntries() {
  return db.select().from(entries).all();
}
```
If kept `async`, add a comment explaining the intentional choice.

---

### IN-02: Redundant ternary in entry count display

**File:** `src/app/page.tsx:17`
**Issue:** `entries.length === 0 ? '0 entries' : \`${entries.length} entries\`` — both branches produce the same format. The template literal handles zero correctly without the ternary guard.
**Fix:**
```tsx
<p className="mt-4 text-zinc-600">{entries.length} entries</p>
```

---

### IN-03: Stale scaffold metadata in layout.tsx

**File:** `src/app/layout.tsx:15-18`
**Issue:** The `metadata` export still contains `create-next-app` placeholder values:
```ts
title: "Create Next App",
description: "Generated by create next app",
```
These appear in the browser tab and `<meta>` tags for the app.
**Fix:**
```ts
export const metadata: Metadata = {
  title: "Dev Journal",
  description: "Personal developer journal — write and search your work.",
};
```

---

_Reviewed: 2026-05-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
