# Phase 4: Search & Filter - Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 5 new/modified files
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/actions.ts` | service | CRUD + request-response | `src/lib/actions.ts` (self — add `searchEntries`) | exact (extension) |
| `src/app/page.tsx` | component (page) | request-response | `src/app/page.tsx` (self — add searchParams) | exact (extension) |
| `src/components/search-input.tsx` | component | event-driven | `src/components/delete-button.tsx` | role-match (`'use client'` + `useRouter`) |
| `src/components/active-filter-chip.tsx` | component | event-driven | `src/components/delete-button.tsx` | role-match (`'use client'` + `useRouter`) |
| `src/components/tag-chip.tsx` | component | event-driven | `src/components/delete-button.tsx` | exact (same `useRouter.push` pattern) |
| `tests/search.test.ts` | test | CRUD | `tests/actions.test.ts` | exact (same in-memory SQLite + Drizzle setup) |

---

## Pattern Assignments

### `src/lib/actions.ts` — add `searchEntries(q, tag)` (service, CRUD)

**Analog:** `src/lib/actions.ts` lines 30–62 (`getEntries`) and lines 121–137 (`setEntryTags` for raw SQL via `db.$client`)

**Imports pattern** (lines 1–12 — already present, no new imports needed):
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { entries, tags, entryTags } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { generateSnippet, formatEntryDate } from '@/lib/utils/format';
```

**Core Drizzle JOIN pattern to reuse** (lines 31–61, `getEntries`):
```typescript
const rows = db
  .select({
    id:        entries.id,
    title:     entries.title,
    body:      entries.body,
    createdAt: entries.createdAt,
    tagName:   tags.name,
  })
  .from(entries)
  .leftJoin(entryTags, eq(entries.id, entryTags.entryId))
  .leftJoin(tags, eq(entryTags.tagId, tags.id))
  .orderBy(desc(entries.createdAt))
  .all();

const now = new Date();
const map = new Map<number, EntryListItem & { body: string; createdAt: Date }>();
for (const row of rows) {
  if (!map.has(row.id)) {
    map.set(row.id, {
      id:        row.id,
      title:     row.title,
      body:      row.body,
      createdAt: row.createdAt,
      snippet:   generateSnippet(row.body),
      dateLabel: formatEntryDate(row.createdAt, now),
      tags:      [],
    });
  }
  if (row.tagName) map.get(row.id)!.tags.push(row.tagName);
}
return Array.from(map.values()).map(({ body: _body, createdAt: _ca, ...rest }) => rest);
```

**Raw SQL via `db.$client` pattern** (lines 124–133, `setEntryTags`):
```typescript
// This is how FTS5 queries must be executed — Drizzle has no FTS5 support
db.$client.prepare('DELETE FROM entry_tags WHERE entry_id = ?').run(entryId);
const tag = db.$client.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: number };
```

**FTS5 query construction for `searchEntries`** — two-query approach per RESEARCH.md Pattern 6:
```typescript
// Query 1: FTS5 returns matching entry base fields (no tags)
const ftsRows = db.$client.prepare(`
  SELECT e.id, e.title, e.body, e.created_at
  FROM entries_fts
  JOIN entries e ON entries_fts.rowid = e.id
  WHERE entries_fts MATCH ?
  ORDER BY rank
`).all(cleanQ) as Array<{ id: number; title: string; body: string; created_at: number }>;

// Query 2: fetch tags for the matched entry IDs (same Map merge as getEntries)
const ids = ftsRows.map(r => r.id);
const tagRows = db.$client.prepare(`
  SELECT et.entry_id, t.name
  FROM entry_tags et
  JOIN tags t ON et.tag_id = t.id
  WHERE et.entry_id IN (${ids.map(() => '?').join(',')})
`).all(...ids) as Array<{ entry_id: number; name: string }>;
```

**FTS5 empty-query guard** (hard requirement from ROADMAP.md):
```typescript
export async function searchEntries(
  q: string | null,
  tag: string | null
): Promise<EntryListItem[]> {
  const cleanQ = q?.trim() ?? '';
  const hasQ = cleanQ.length > 0;
  const hasTag = (tag?.trim().length ?? 0) > 0;

  // Guard: never call FTS5 MATCH with empty string — SQLite throws syntax error
  if (!hasQ && !hasTag) {
    return getEntries();  // delegate to existing function
  }
  // ... branch on hasQ / hasTag
}
```

---

### `src/app/page.tsx` — add `searchParams` prop (component/page, request-response)

**Analog:** `src/app/page.tsx` (self — current version lines 1–29)

**Current pattern to extend** (lines 8–29):
```typescript
// Current signature — no searchParams:
export default async function Home() {
  const entries = await getEntries();
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {entries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm">No entries yet.</p>
          <p className="mt-1 text-zinc-400 text-xs">
            Your journal is empty. Entries you write will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </main>
  );
}
```

**Updated signature pattern** — Next.js 16 (15+) requires `await searchParams`:
```typescript
// searchParams is a Promise in Next.js 15+; must be awaited
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>
}) {
  const { q, tag } = await searchParams;
  const entries = await searchEntries(q ?? null, tag ?? null);
  const isFiltered = Boolean(q || tag);
  // ...
}
```

**Empty state copy to preserve** (lines 14–19 — keep for unfiltered empty state):
```typescript
<div className="py-16 text-center">
  <p className="text-zinc-500 text-sm">No entries yet.</p>
  <p className="mt-1 text-zinc-400 text-xs">
    Your journal is empty. Entries you write will appear here.
  </p>
</div>
```

**Entry list container to preserve** (lines 21–26):
```typescript
<div className="divide-y divide-zinc-200">
  {entries.map((entry) => (
    <EntryCard key={entry.id} entry={entry} />
  ))}
</div>
```

**`<SearchInput>` must be wrapped in `<Suspense>`** — required by Next.js App Router when `useSearchParams` is used inside a client component rendered during SSR:
```typescript
import { Suspense } from 'react';
// ...
<Suspense fallback={null}>
  <SearchInput defaultValue={q ?? ''} />
</Suspense>
```

---

### `src/components/search-input.tsx` — NEW (component, event-driven)

**Analog:** `src/components/delete-button.tsx` lines 1–56

**`'use client'` + `useRouter` import pattern** (lines 1–4):
```typescript
'use client'

import { useRouter } from 'next/navigation'
```

**Add `useSearchParams` for param preservation** — new import alongside `useRouter`:
```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Search } from 'lucide-react'
```

**`useRouter` instantiation pattern** (line 23 of delete-button.tsx):
```typescript
const router = useRouter()
```

**Debounce + URLSearchParams preservation pattern** — no analog in codebase, use RESEARCH.md Pattern 2:
```typescript
const searchParams = useSearchParams()
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  if (timerRef.current) clearTimeout(timerRef.current)
  timerRef.current = setTimeout(() => {
    const params = new URLSearchParams(searchParams.toString())
    const val = e.target.value.trim()
    if (val) {
      params.set('q', val)
    } else {
      params.delete('q')
    }
    // Use router.replace (not push) — intermediate typing states should not
    // pollute browser history; final debounced value remains addressable
    router.replace(`/?${params.toString()}`)
  }, 300)
}, [router, searchParams])
```

**Use `defaultValue` (uncontrolled), not `value`** — controlled input fights async debounce:
```typescript
<input
  type="search"
  defaultValue={defaultValue}
  onChange={handleChange}
  // ...
/>
```

**Icon pattern from existing components** — lucide-react icons are used inline (no special wrapper):
```typescript
import { Search } from 'lucide-react'
// Used as: <Search className="h-4 w-4 text-muted-foreground" />
```

---

### `src/components/active-filter-chip.tsx` — NEW (component, event-driven)

**Analog:** `src/components/delete-button.tsx` lines 1–56

**`'use client'` + `useRouter` pattern** (lines 1–4 of delete-button.tsx):
```typescript
'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
```

**Handler pattern** (lines 24–27 of delete-button.tsx — async function as named declaration):
```typescript
// delete-button uses async; active-filter-chip handler is sync (just router.push)
function handleClear() {
  const params = new URLSearchParams()
  if (currentQ) params.set('q', currentQ)
  const qs = params.toString()
  router.push(qs ? `/?${qs}` : '/')
}
```

**Button element pattern** (lines 32–35 of delete-button.tsx — `type="button"` required):
```typescript
// delete-button uses AlertDialogTrigger; active-filter-chip uses a plain button
// Always set type="button" on interactive buttons inside forms to prevent submit
<button
  type="button"
  aria-label="Clear tag filter"
  onClick={handleClear}
>
```

**Chip visual style** — modeled on TagChip's `rounded-full` + `bg-zinc-100` palette, but muted:
```typescript
// TagChip baseline (tag-chip.tsx line 10):
// "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600"
// ActiveFilterChip — slightly larger padding, includes × button, same zinc palette
<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 mt-2">
  <span className="text-xs font-normal text-zinc-600">Active filter: {tag}</span>
  <button type="button" aria-label="Clear tag filter" onClick={handleClear}
    className="p-1 text-zinc-400 hover:text-zinc-700">
    <X className="h-3 w-3" />
  </button>
</div>
```

---

### `src/components/tag-chip.tsx` — MODIFIED (component, event-driven)

**Analog:** `src/components/delete-button.tsx` lines 1–4 + 22–27

**Current implementation to replace** (tag-chip.tsx lines 1–14):
```typescript
// Current — non-interactive span, no 'use client':
interface Props {
  name: string;
}

export default function TagChip({ name }: Props) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
      {name}
    </span>
  );
}
```

**`'use client'` + `useRouter` pattern** (lines 1–4 of delete-button.tsx):
```typescript
'use client'

import { useRouter } from 'next/navigation'
```

**`router.push` navigation pattern** (lines 22–27 of delete-button.tsx):
```typescript
const router = useRouter()
// delete-button uses router.replace; TagChip uses router.push (tag filter is a new search state)
// encodeURIComponent required for tag names with spaces/special chars
onClick={() => router.push(`/?tag=${encodeURIComponent(name)}`)}
```

**Preserve existing visual classes** — only change `<span>` → `<button>` and add click handler:
```typescript
// Keep all existing Tailwind classes; add cursor-pointer + hover states:
<button
  type="button"
  onClick={() => router.push(`/?tag=${encodeURIComponent(name)}`)}
  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal
             bg-zinc-100 text-zinc-600 cursor-pointer hover:bg-zinc-200 hover:text-zinc-900"
>
  {name}
</button>
```

**Note:** UI-SPEC specifies `font-normal` — the current implementation uses `font-medium`. Change to `font-normal` during the upgrade.

---

### `tests/search.test.ts` — NEW (test, CRUD)

**Analog:** `tests/actions.test.ts` lines 1–39 (setup) and lines 41–212 (test structure)

**Import pattern** (lines 1–6 of actions.test.ts):
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
```

**In-memory SQLite setup pattern** (lines 8–39 of actions.test.ts):
```typescript
let testDb: ReturnType<typeof drizzle<typeof schema>>;

beforeEach(() => {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');

  sqlite.exec(`
    CREATE TABLE entries ( ... );
    CREATE TABLE tags ( ... );
    CREATE TABLE entry_tags ( ... );
  `);

  testDb = drizzle(sqlite, { schema });
});
```

**Extension for FTS5** — add FTS5 virtual table + triggers to the `sqlite.exec` block:
```typescript
beforeEach(() => {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');

  sqlite.exec(`
    CREATE TABLE entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL DEFAULT '',
      body       TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE tags (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE entry_tags (
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
      PRIMARY KEY (entry_id, tag_id)
    );
    -- FTS5 additions (not in actions.test.ts — new for search.test.ts):
    CREATE VIRTUAL TABLE entries_fts
      USING fts5(title, body, content=entries, content_rowid=id);
    CREATE TRIGGER entries_fts_insert
      AFTER INSERT ON entries BEGIN
        INSERT INTO entries_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
      END;
    CREATE TRIGGER entries_fts_update
      AFTER UPDATE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, body)
          VALUES ('delete', old.id, old.title, old.body);
        INSERT INTO entries_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
      END;
    CREATE TRIGGER entries_fts_delete
      AFTER DELETE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, body)
          VALUES ('delete', old.id, old.title, old.body);
      END;
  `);

  testDb = drizzle(sqlite, { schema });
});
```

**Test structure pattern** (lines 41–68 of actions.test.ts — `describe` + `it` + setup + assertion):
```typescript
describe('searchEntries — keyword search', () => {
  it('returns matching entries for a keyword in title', () => {
    // insert via testDb or sqlite directly, then call the logic under test
  });
  it('returns empty array (not crash) when q is empty string', () => {
    // guard test — FTS5 must not be called with ''
  });
});
```

---

## Shared Patterns

### `'use client'` component structure
**Source:** `src/components/delete-button.tsx` lines 1–4
**Apply to:** `search-input.tsx`, `active-filter-chip.tsx`, `tag-chip.tsx`
```typescript
'use client'

import { useRouter } from 'next/navigation'
```

### `useRouter` instantiation
**Source:** `src/components/delete-button.tsx` line 23
**Apply to:** `search-input.tsx`, `active-filter-chip.tsx`, `tag-chip.tsx`
```typescript
const router = useRouter()
```

### Raw SQL via `db.$client.prepare()`
**Source:** `src/lib/actions.ts` lines 124–133 (`setEntryTags`)
**Apply to:** `searchEntries()` FTS5 query paths in `actions.ts`
```typescript
db.$client.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: number };
// For .all() with spread args:
db.$client.prepare(`SELECT ... WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids)
```

### Map-based tag merge pattern
**Source:** `src/lib/actions.ts` lines 46–61 (`getEntries`)
**Apply to:** `searchEntries()` tag merge step after two-query FTS5 approach
```typescript
const map = new Map<number, EntryListItem & { body: string; createdAt: Date }>();
for (const row of rows) {
  if (!map.has(row.id)) {
    map.set(row.id, { ...baseFields, tags: [] });
  }
  if (row.tagName) map.get(row.id)!.tags.push(row.tagName);
}
return Array.from(map.values()).map(({ body: _body, createdAt: _ca, ...rest }) => rest);
```

### `type="button"` on interactive buttons
**Source:** `src/components/delete-button.tsx` line 32 (`AlertDialogTrigger type="button"`)
**Apply to:** `active-filter-chip.tsx`, `tag-chip.tsx` — prevents accidental form submission
```typescript
<button type="button" onClick={...}>
```

### In-memory SQLite test setup
**Source:** `tests/actions.test.ts` lines 8–39
**Apply to:** `tests/search.test.ts` — extend with FTS5 virtual table + triggers in `sqlite.exec`
```typescript
const sqlite = new Database(':memory:');
sqlite.pragma('foreign_keys = ON');
sqlite.exec(`CREATE TABLE entries (...); ...`);
const testDb = drizzle(sqlite, { schema });
```

---

## No Analog Found

All files have close analogs in the codebase. No files require RESEARCH.md patterns as primary reference.

| File | Note |
|------|------|
| `src/components/search-input.tsx` | Debounce + `useSearchParams` combination has no existing analog — use RESEARCH.md Pattern 2 for the debounce + `URLSearchParams` preservation logic. The `'use client'` + `useRouter` shell IS from `delete-button.tsx`. |

---

## Metadata

**Analog search scope:** `src/lib/`, `src/app/`, `src/components/`, `tests/`
**Files scanned:** 6 source files read directly
**Pattern extraction date:** 2026-05-27
