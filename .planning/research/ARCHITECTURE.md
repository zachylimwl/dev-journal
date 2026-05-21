# Architecture Patterns: Dev Journal (Next.js + SQLite)

**Domain:** Personal CRUD web app with full-text search
**Researched:** 2026-05-21
**Overall confidence:** HIGH — verified against Next.js official docs and better-sqlite3 official docs via Context7

---

## Recommended Architecture

### App Router over Pages Router

Use the **App Router** (`app/` directory). Rationale:

- Server Actions eliminate the need for a separate API layer for CRUD — no boilerplate fetch/route handler for every mutation
- Server Components render the entry list and entry view on the server — no client-side data fetching hooks needed
- `revalidatePath` / `revalidateTag` handles cache invalidation after mutations cleanly
- The Pages Router is maintained but not where Next.js development is focused going forward

**Pages Router is not recommended** for this project. There is no meaningful benefit for a single-user local app, and it requires API routes + client-side fetch for mutations that Server Actions handle inline.

### Server Actions over API Routes

Use **Server Actions** for all CRUD operations. Rationale:

- Mutations live in `app/actions.ts`, called directly from components with `'use server'`
- Forms can use `action={serverAction}` natively — no JavaScript required for progressive enhancement
- Client components call them as regular async functions — no `fetch('/api/entries', { method: 'POST', body: ... })` boilerplate
- `revalidatePath('/')` after each mutation keeps the entry list fresh

**API Route Handlers** (`app/api/route.ts`) are only needed if you later add a programmatic HTTP interface (e.g., import script, CLI tool). For the UI-driven journal app, they add no value.

---

## Component Boundaries

```
app/
  layout.tsx              — Root layout: font, global CSS, sidebar shell
  page.tsx                — Home: renders EntryList (Server Component)
  actions.ts              — All Server Actions: createEntry, updateEntry, deleteEntry
  entries/
    [id]/
      page.tsx            — Entry detail view (Server Component, fetches by ID)
      edit/
        page.tsx          — Edit form (Client Component for markdown editor)
  search/
    page.tsx              — Search results page (Server Component)

components/
  EntryList.tsx           — Server Component: renders list of entries with tags
  EntryCard.tsx           — Server Component: single entry summary card
  EntryEditor.tsx         — Client Component ('use client'): markdown textarea, tag input
  EntryViewer.tsx         — Server Component: renders Markdown to HTML
  SearchBar.tsx           — Client Component: controlled input, navigates to /search?q=
  TagFilter.tsx           — Client Component: tag chips that toggle filter params
  TagBadge.tsx            — Shared presentational: single tag pill

lib/
  db.ts                   — SQLite singleton + all query functions
  schema.ts               — Database initialization SQL (run once on startup)
  types.ts                — TypeScript interfaces: Entry, Tag, SearchResult
```

### What Talks to What

| From | To | How |
|------|----|-----|
| `page.tsx` | `lib/db.ts` | Direct import (Server Component — runs on server) |
| `entries/[id]/page.tsx` | `lib/db.ts` | Direct import |
| `app/actions.ts` | `lib/db.ts` | Direct import (Server Action — runs on server) |
| `EntryEditor.tsx` | `app/actions.ts` | Import + call as async function (Client → Server Action) |
| `SearchBar.tsx` | URL params | `router.push('/search?q=...')` — triggers server re-render |
| `TagFilter.tsx` | URL params | `router.push('/?tag=...')` — triggers server re-render |
| `EntryList.tsx` | `lib/db.ts` | Direct import |
| Nothing | Client-side API fetch | Not needed — all data flows through Server Components or Server Actions |

---

## Data Flow

### Read path (displaying entries)

```
Browser request → Next.js Server → page.tsx (Server Component)
                                       ↓
                                   lib/db.ts (SQLite query)
                                       ↓
                                   EntryList / EntryCard (rendered HTML)
                                       ↓
                               Browser receives HTML
```

No client-side fetch. No loading spinner. The page arrives with data.

### Write path (create / update / delete)

```
User submits form / clicks button
        ↓
EntryEditor calls Server Action (app/actions.ts)
        ↓
Server Action runs lib/db.ts write query
        ↓
Server Action calls revalidatePath('/') or revalidatePath('/entries/[id]')
        ↓
Next.js invalidates cached page → re-renders on next request
        ↓
User sees updated data
```

### Search path

```
SearchBar input (Client Component)
        ↓
router.push('/search?q=foobar&tag=react')
        ↓
search/page.tsx (Server Component) reads searchParams
        ↓
lib/db.ts runs FTS5 query
        ↓
Rendered results returned
```

Search is stateless and URL-driven. The URL is the search state — no client-side state management needed.

---

## Database Schema

### Design decision: Tags as separate table

Use a **junction table** (`entry_tags`), not JSON array, not comma-separated string.

- JSON array: queryable in SQLite with `json_each()` but awkward for "find entries by tag", requires full-scan
- Comma-separated: cannot be indexed, requires LIKE queries, breaks on tag names with commas
- Junction table: indexed lookups, simple JOIN, supports tag autocomplete query (`SELECT DISTINCT name FROM tags`), trivially correct

### Schema

```sql
CREATE TABLE IF NOT EXISTS entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL DEFAULT '',
  content     TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  title,
  content,
  content='entries',
  content_rowid='id'
);

-- Keep FTS index in sync via triggers
CREATE TRIGGER IF NOT EXISTS entries_fts_insert AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS entries_fts_update AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, title, content)
    VALUES ('delete', old.id, old.title, old.content);
  INSERT INTO entries_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS entries_fts_delete AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, title, content)
    VALUES ('delete', old.id, old.title, old.content);
END;
```

### FTS5 query pattern

```typescript
// In lib/db.ts
export function searchEntries(query: string, tag?: string): Entry[] {
  // FTS5 match query — use MATCH for full-text, JOIN for tag filter
  const sql = tag
    ? `
      SELECT e.* FROM entries e
      JOIN entries_fts fts ON fts.rowid = e.id
      JOIN entry_tags et ON et.entry_id = e.id
      JOIN tags t ON t.id = et.tag_id
      WHERE entries_fts MATCH ? AND t.name = ?
      ORDER BY rank
    `
    : `
      SELECT e.* FROM entries e
      JOIN entries_fts fts ON fts.rowid = e.id
      WHERE entries_fts MATCH ?
      ORDER BY rank
    `;
  return tag
    ? db.prepare(sql).all(query, tag) as Entry[]
    : db.prepare(sql).all(query) as Entry[];
}
```

FTS5 is **bundled in better-sqlite3 by default** (confirmed: `SQLITE_ENABLE_FTS5` is in the default compilation flags). No additional configuration needed.

---

## SQLite Singleton Pattern

better-sqlite3 uses a **synchronous** API — this is intentional and safe for a single-user local app. No async/await needed for database calls.

### The problem

Next.js `next dev` uses Hot Module Replacement (HMR). Every file edit re-evaluates modules. Without a singleton, each HMR cycle opens a new database connection — connections accumulate and eventually error.

### The solution: globalThis singleton

```typescript
// lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';
import { initializeSchema } from './schema';

const DB_PATH = path.join(process.cwd(), 'journal.db');

// Use globalThis to survive HMR re-evaluation in dev
const globalForDb = globalThis as unknown as { db: Database.Database | undefined };

export const db: Database.Database =
  globalForDb.db ?? new Database(DB_PATH);

if (!globalForDb.db) {
  globalForDb.db = db;
  initializeSchema(db);  // runs CREATE TABLE IF NOT EXISTS on first open
}
```

**Why `process.cwd()`:** Next.js Server Components and Server Actions always run in the Node.js process whose working directory is the project root. `process.cwd()` is reliable here. Do not use `__dirname` (breaks in some Next.js bundling contexts). Do not use a relative path like `'./journal.db'` (ambiguous depending on where Node resolves it).

**Why `globalThis`:** The `globalThis` object is shared across all module evaluations within the same Node.js process. HMR re-runs module code but does not restart the process — so a connection stored on `globalThis` survives reloads. This is the same pattern Next.js itself recommends for Prisma client initialization.

---

## Suggested Build Order

Dependencies flow bottom-up. Build in this order to avoid building UI before there is data to display.

### 1. Database layer (`lib/`)
- `lib/types.ts` — Entry, Tag, EntryWithTags interfaces
- `lib/schema.ts` — CREATE TABLE statements + FTS5 triggers
- `lib/db.ts` — singleton + all query functions (getEntries, getEntry, createEntry, updateEntry, deleteEntry, searchEntries, getAllTags)

No UI dependency. Can be tested in isolation with a simple Node script.

### 2. Server Actions (`app/actions.ts`)
- createEntry, updateEntry, deleteEntry
- Each calls `revalidatePath` after mutation
- Depends on: `lib/db.ts`

### 3. Entry list view
- `components/EntryCard.tsx` — presentational
- `components/EntryList.tsx` — fetches entries, renders cards
- `app/page.tsx` — renders EntryList

Depends on: database layer. Gives you a working read path early.

### 4. Entry detail view
- `components/EntryViewer.tsx` — renders Markdown (react-markdown)
- `app/entries/[id]/page.tsx` — fetches entry by ID, renders EntryViewer

Depends on: database layer + EntryCard (for back-link context).

### 5. Create / Edit flow
- `components/EntryEditor.tsx` — textarea + tag input, calls Server Actions
- `app/entries/new/page.tsx` — wraps EntryEditor for creation
- `app/entries/[id]/edit/page.tsx` — wraps EntryEditor pre-populated for editing

Depends on: Server Actions, EntryViewer (to redirect to after save).

### 6. Search and filtering
- `components/SearchBar.tsx` — URL-driven input
- `components/TagFilter.tsx` — URL-driven tag chips
- `app/search/page.tsx` — reads searchParams, calls searchEntries, renders results

Depends on: FTS5 schema (set up in step 1), EntryList/EntryCard for results rendering.

### 7. Tag management
- `components/TagBadge.tsx` — shared tag pill component
- Tag autocomplete in EntryEditor (query `getAllTags()`)

Depends on: tag schema (step 1), EntryEditor (step 5).

---

## Patterns to Follow

### Pattern 1: URL as search state
Never put search query or active tag filter in React state. Put them in URL query params. This makes results shareable, bookmarkable, and lets the browser back button work. Server Components read `searchParams` directly.

### Pattern 2: Server Components by default, Client Components at the leaf
Keep all data-fetching components as Server Components. Only switch to `'use client'` when you need interactivity: the markdown editor textarea, the search input (controlled), the tag filter chips (toggle state). Do not make a component a Client Component just to avoid async/await — embrace async Server Components.

### Pattern 3: One actions.ts file for all mutations
Keep all Server Actions in a single `app/actions.ts`. For a small app, splitting by domain adds navigation overhead without benefit. Consolidation makes it easy to see all side effects in one place.

### Pattern 4: Schema initialization at connection time
Run `CREATE TABLE IF NOT EXISTS` every time the db singleton is first created. This means the app is zero-setup — `npm run dev` on a fresh machine creates the database file and schema automatically.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Async database calls
better-sqlite3 is **synchronous by design** and is the fastest SQLite library for Node.js because of it. Do not wrap calls in `Promise.resolve()` or attempt to use it with async/await. Use it synchronously — this is correct and idiomatic.

### Anti-Pattern 2: Opening database in every request
Do not call `new Database(path)` at the top level of a Server Component or Server Action. This bypasses the singleton and opens a new connection per request. All database access goes through the singleton in `lib/db.ts`.

### Anti-Pattern 3: Storing tag list in entry content
Do not encode tags as a field inside the Markdown content (e.g., `#tag` hashtags). Metadata belongs in the database schema. Parsing tags from content is fragile and makes filtering require a full scan.

### Anti-Pattern 4: Client-side search
Do not fetch all entries to the client and filter in JavaScript. Even at 1,000 entries this works, but it defeats SQLite FTS5 and makes the app feel slower. Keep search server-side.

---

## Scalability Notes

This is a local single-user app. Scalability is not a concern. However:

| Concern | Current approach | Notes |
|---------|-----------------|-------|
| Entry count | SQLite + FTS5 | Handles 100K+ entries easily |
| Concurrent users | N/A — single user | SQLite WAL mode if ever needed |
| Search relevance | FTS5 `rank` column | Sufficient for keyword search |
| Large content | No limit set | Consider `PRAGMA journal_mode=WAL` for large db files |

---

## Sources

- Next.js Server Actions: https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/forms.mdx (HIGH confidence — official docs via Context7)
- Next.js App Router migration: https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/migrating/app-router-migration.mdx (HIGH confidence — official docs via Context7)
- Next.js revalidatePath: https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/incremental-static-regeneration.mdx (HIGH confidence — official docs via Context7)
- better-sqlite3 API: https://github.com/wiselibs/better-sqlite3/blob/master/docs/api.md (HIGH confidence — official docs via Context7)
- better-sqlite3 FTS5 bundled: https://github.com/wiselibs/better-sqlite3/blob/master/docs/compilation.md (HIGH confidence — official docs via Context7)
- SQLite FTS5: https://www.sqlite.org/fts5.html (HIGH confidence — SQLite official documentation)
- globalThis HMR pattern: Next.js Turbopack source confirming `globalThis.__turbopack_module_cache__` pattern (HIGH confidence — official Next.js source)
