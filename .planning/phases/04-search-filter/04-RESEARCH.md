# Phase 4: Search & Filter — Research

**Researched:** 2026-05-27
**Domain:** Next.js App Router URL-state search, SQLite FTS5, React client components with `useRouter`/`useSearchParams`
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** URL search params (`?q=keyword&tag=project-name`) for search state. Home page remains a Server Component reading `searchParams`.
- **D-02:** URL shape: `/?q=keyword`, `/?tag=project-name`, `/?q=keyword&tag=project-name`. Both optional; absent = no filter.
- **D-03:** Single `searchEntries(q, tag)` Server Action handles all cases, returns all entries when both params empty. `getEntries()` remains for non-home usage.
- **D-04:** `SearchInput` is a `'use client'` component using `useRouter` + `useSearchParams` with debounced `router.push`. Home page stays a Server Component.
- **D-05:** Search input lives inline on the home page only — above entry list, below header. `AppHeader` unchanged.
- **D-06:** Result count label ("N entries") shown between search input and entry list only when q or tag is set.
- **D-07:** No-results contextual empty state (wording at Claude's discretion).
- **D-08:** TagChip becomes a navigating client component — clicking navigates to `/?tag={name}`. Applies on all pages. `EditorTagChip` unaffected.
- **D-09:** Active filter chip ("Active filter: frontend ×") above entry list when `?tag` is set. Clicking × clears tag param.
- **D-10:** TagChip must become `'use client'` with `router.push`.

### Claude's Discretion

- Exact debounce delay (suggested: 300ms).
- Exact empty-state copy for no-results states (keyword and tag variants).
- Whether `SearchInput` and active filter chip are a single component or two adjacent components.
- FTS5 special-character handling (strip/escape FTS5 syntax chars from user input).
- Visual styling of active filter chip.

### Deferred Ideas (OUT OF SCOPE)

- Search result snippet highlighting (V2-SRCH-01).
- Tag autocomplete (V2-SRCH-02).
- Entry count per tag (V2-VIEW-02).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRCH-01 | User can search entries by keyword with live results (updates on keypress, debounced) | `searchEntries(q, tag)` via FTS5 MATCH; `SearchInput` client component with 300ms debounce + `router.push` |
| SRCH-02 | User can filter entries by tag to see all entries with that tag | TagChip upgraded to `'use client'` with `router.push('/?tag=...')`; `searchEntries(null, tag)` filters via tag JOIN |
| SRCH-03 | User can combine keyword search and tag filter simultaneously | `searchEntries(q, tag)` branches: FTS5 MATCH + tag JOIN when both present; URL preserves both params across interactions |
</phase_requirements>

---

## Summary

Phase 4 is an additive phase — no new routes, no new CRUD, no schema changes. Everything builds on the completed infrastructure from Phases 1–3. The two principal technical concerns are: (1) FTS5 query construction and the mandatory empty-query guard, and (2) client-side URL state management with `useRouter`/`useSearchParams` in a minimally-client-surfaced Next.js App Router app.

The architecture is cleanly divided: the home page (`src/app/page.tsx`) stays a pure Server Component that reads `searchParams`, calls `searchEntries()`, and passes data down. Two new client components (`SearchInput`, updated `TagChip`) are the only interactive pieces, each doing a single job: pushing URL params. The `searchEntries()` Server Action branches on which params are present — falling back to a plain JOIN query when no text search is needed, so FTS5 is never called with an empty string.

The UI contract is fully locked by `04-UI-SPEC.md`. No UI design decisions remain open for the planner — spacing, typography, copy, component shapes, and accessibility attributes are all specified.

**Primary recommendation:** Implement `searchEntries()` first (data layer), then wire up `SearchInput` + TagChip upgrade (client layer), then compose the home page layout. Each layer is independently testable.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| FTS5 query execution | API / Backend (Server Action) | — | `better-sqlite3` is Node.js only; raw SQL via `db.$client.prepare()`; never runs on client |
| Tag JOIN filtering | API / Backend (Server Action) | — | Same `searchEntries()` function; Drizzle query or raw SQL |
| URL state (q, tag params) | Browser / Client | Frontend Server (SSR read) | Client components push params; server page reads them as props |
| Search input with debounce | Browser / Client | — | `useRouter` + `useSearchParams` require `'use client'` |
| TagChip navigation | Browser / Client | — | `router.push` requires `'use client'` |
| Result count label | Frontend Server (SSR) | — | Computed server-side from result array length; rendered inline in `page.tsx` |
| Active filter chip | Frontend Server (SSR) + Client | — | Rendered conditionally server-side; × button navigates client-side (can be a small client component or server-rendered with a link) |
| Empty state | Frontend Server (SSR) | — | Conditional render in `page.tsx` based on result array |
| Home page layout | Frontend Server (SSR) | — | `page.tsx` remains a Server Component |

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.6 | `searchParams` prop on Server Components; `useRouter`/`useSearchParams` on Client Components | Already in project; standard pattern for URL state |
| better-sqlite3 | 12.10.0 | Raw SQL for FTS5 queries via `db.$client.prepare()` | FTS5 is not expressible in Drizzle; raw SQL is the established pattern in this codebase (`initSchema`, `setEntryTags`) |
| Drizzle ORM | 0.45.2 | Tag JOIN query path in `searchEntries()` | Already used for all JOIN queries; reuse `getEntries()` pattern |
| lucide-react | 1.16.0 | `Search` icon (16px) in `SearchInput`; `X` icon (12px) in `ActiveFilterChip` | Already installed; established icon pattern in the project |

**No new packages to install.** This phase uses only what is already present.

### Supporting (existing, referenced by this phase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Input (`/ui/input.tsx`) | already copied | Base for `SearchInput` styling | Optional — use as base or hand-author; either is correct |
| `useSearchParams` (next/navigation) | Next.js 16.2.6 | Read current URL params in client component | Required in `SearchInput` to preserve existing params when pushing new ones |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| URL params for search state | `useState` in a client component | URL params give bookmarkability, back/forward navigation, SSR-rendered results — chosen (D-01) |
| `useSearchParams` for param reads | `window.location.search` | `useSearchParams` is the React/Next.js idiomatic API; works with concurrent rendering |
| Raw `db.$client.prepare()` for FTS5 | Drizzle raw SQL | Both reach the same SQLite layer; `db.$client` is the established codebase pattern for raw SQL |

**Installation:** None required — all dependencies already present.

---

## Package Legitimacy Audit

> No new packages are introduced in this phase. All code uses existing installed dependencies.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser keypress / TagChip click
         │
         ▼
  SearchInput / TagChip            ('use client' components)
  useRouter.push(?q=...&tag=...)
         │
         ▼
  Next.js App Router navigation
  URL changes → page.tsx re-renders (Server Component)
         │
         ▼
  page.tsx reads searchParams       (Server Component — no 'use client')
  const { q, tag } = await searchParams
         │
         ▼
  searchEntries(q, tag)             ('use server' Server Action)
         │
         ├─── q empty AND tag empty ──► plain JOIN query (reuse getEntries pattern)
         │
         ├─── tag only ───────────────► JOIN entries → entry_tags → tags WHERE name = tag
         │                              ORDER BY created_at DESC
         │
         ├─── q only ─────────────────► FTS5: entries_fts MATCH ? → JOIN entries
         │                              ORDER BY rank (BM25)
         │
         └─── q AND tag ──────────────► FTS5 MATCH ? + tag JOIN
                                         ORDER BY rank
         │
         ▼
  EntryListItem[]
         │
         ▼
  page.tsx renders:
  <SearchInput defaultValue={q} />
  [ResultCountLabel if q or tag]
  [ActiveFilterChip if tag]
  [EmptyState if results.length === 0]
  [EntryCard list if results.length > 0]
```

### Recommended Project Structure

```
src/
├── app/
│   └── page.tsx                  # modified — receives searchParams, calls searchEntries()
├── components/
│   ├── search-input.tsx          # NEW — 'use client', debounced router.push
│   ├── active-filter-chip.tsx    # NEW — 'use client' or Server Component with Link
│   └── tag-chip.tsx              # MODIFIED — add 'use client', router.push
└── lib/
    └── actions.ts                # MODIFIED — add searchEntries(q, tag)
```

No new routes. No new DB files. No schema changes.

### Pattern 1: `searchEntries()` Server Action with FTS5 Guard

**What:** A single function that handles all four query cases by branching on `q` and `tag`. The FTS5 branch uses raw SQL via `db.$client.prepare()`. The tag-only branch reuses the Drizzle JOIN pattern from `getEntries()`.

**When to use:** Called exclusively from `page.tsx` (home page). Replaces `getEntries()` on the home page.

**Critical rule:** Never pass an empty string to `entries_fts MATCH ?` — SQLite FTS5 throws a syntax error on empty queries. Branch on `q` being falsy/whitespace BEFORE constructing the SQL.

```typescript
// Source: SQLite FTS5 documentation (sqlite.org/fts5.html) [CITED]
// Pattern: db.$client.prepare() established in src/lib/actions.ts (setEntryTags)

export async function searchEntries(
  q: string | null,
  tag: string | null
): Promise<EntryListItem[]> {
  const cleanQ = q?.trim() ?? '';
  const hasQ = cleanQ.length > 0;
  const hasTag = (tag?.trim().length ?? 0) > 0;

  // Case 1: no filters — return all entries (same as getEntries)
  if (!hasQ && !hasTag) {
    return getEntries();
  }

  // Case 2: tag only — Drizzle JOIN, no FTS5
  if (!hasQ && hasTag) {
    // Drizzle query: entries JOIN entry_tags JOIN tags WHERE tags.name = tag
    // ORDER BY entries.createdAt DESC
    // ... (reuse getEntries JOIN pattern with added .where())
  }

  // Case 3: keyword only — FTS5 MATCH, BM25 ranked
  if (hasQ && !hasTag) {
    const rows = db.$client.prepare(`
      SELECT e.id, e.title, e.body, e.created_at
      FROM entries_fts
      JOIN entries e ON entries_fts.rowid = e.id
      WHERE entries_fts MATCH ?
      ORDER BY rank
    `).all(cleanQ) as Array<{ id: number; title: string; body: string; created_at: number }>;
    // ... map rows to EntryListItem[]
  }

  // Case 4: keyword + tag — FTS5 MATCH + tag JOIN
  if (hasQ && hasTag) {
    const rows = db.$client.prepare(`
      SELECT e.id, e.title, e.body, e.created_at
      FROM entries_fts
      JOIN entries e ON entries_fts.rowid = e.id
      JOIN entry_tags et ON e.id = et.entry_id
      JOIN tags t ON et.tag_id = t.id
      WHERE entries_fts MATCH ?
        AND t.name = ?
      ORDER BY rank
    `).all(cleanQ, tag!.trim()) as Array<{ id: number; title: string; body: string; created_at: number }>;
    // ... map rows to EntryListItem[]
  }
}
```

**Note on FTS5 special characters:** FTS5 treats characters like `"`, `-`, `*`, `(`, `)` as query syntax. User input containing these will cause a parse error unless escaped. Safe approach: strip non-alphanumeric/space characters from `cleanQ` before passing to MATCH, or wrap in double-quotes: `MATCH '"' || ? || '"'`. Stripping is simpler and safer for a journal search use case. [ASSUMED — implementation choice per Claude's discretion, D per CONTEXT.md]

### Pattern 2: `SearchInput` Client Component with Debounce

**What:** A `'use client'` component that reads current URL params, updates `?q=` on each keypress (debounced), and preserves the existing `?tag=` param.

**When to use:** Rendered unconditionally at the top of the home page content area.

```typescript
// Source: Next.js useRouter/useSearchParams docs [CITED: nextjs.org/docs/app/api-reference/functions/use-search-params]
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Search } from 'lucide-react'

interface Props {
  defaultValue?: string
}

export default function SearchInput({ defaultValue = '' }: Props) {
  const router = useRouter()
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
      router.push(`/?${params.toString()}`)
    }, 300)
  }, [router, searchParams])

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        aria-label="Search entries"
        placeholder="Search entries..."
        defaultValue={defaultValue}
        onChange={handleChange}
        className="w-full h-10 pl-9 pr-3 py-2 border border-input rounded-md text-sm
                   placeholder:text-muted-foreground focus:outline-none focus:ring-2
                   focus:ring-ring focus:border-transparent"
      />
    </div>
  )
}
```

**Important:** Use `defaultValue` (uncontrolled), not `value` (controlled). The input is uncontrolled because the debounce timer manages the URL update asynchronously — making it controlled would cause the input to lag or fight with the debounce logic.

### Pattern 3: `TagChip` Upgrade to Client Component

**What:** Replace the `<span>` wrapper with a `<button>` and add `router.push`. Visual styles unchanged. The existing `font-medium` class in the current implementation should match `font-normal` from the UI spec — verify during implementation.

```typescript
// Source: existing src/components/tag-chip.tsx + useRouter pattern from delete-button.tsx
'use client'

import { useRouter } from 'next/navigation'

interface Props {
  name: string
}

export default function TagChip({ name }: Props) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(`/?tag=${encodeURIComponent(name)}`)}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal
                 bg-zinc-100 text-zinc-600 cursor-pointer hover:bg-zinc-200 hover:text-zinc-900"
    >
      {name}
    </button>
  )
}
```

**Note:** `encodeURIComponent` is required for tag names containing spaces or special characters (e.g., `my project` → `my%20project`). The `searchEntries()` function will receive the decoded value from `searchParams`.

### Pattern 4: Home Page with `searchParams`

**What:** Next.js App Router page components receive `searchParams` as a prop. In Next.js 15+, `searchParams` is a Promise that must be `await`-ed.

```typescript
// Source: Next.js App Router searchParams docs [CITED: nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional]
// Note: In Next.js 15+, searchParams is async (Promise). In Next.js 13-14, it was sync.
// This project uses Next.js 16.2.6 — searchParams is a Promise, must be awaited.

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>
}) {
  const { q, tag } = await searchParams
  const entries = await searchEntries(q ?? null, tag ?? null)
  const isFiltered = Boolean(q || tag)

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <SearchInput defaultValue={q ?? ''} />

      {isFiltered && (
        <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
          {entries.length === 1 ? '1 entry' : `${entries.length} entries`}
        </p>
      )}

      {tag && <ActiveFilterChip tag={tag} currentQ={q} />}

      {entries.length === 0 && isFiltered ? (
        <EmptySearchState q={q} tag={tag} />
      ) : entries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm">No entries yet.</p>
          <p className="mt-1 text-zinc-400 text-xs">
            Your journal is empty. Entries you write will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 mt-6">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </main>
  )
}
```

### Pattern 5: `ActiveFilterChip` with × Dismiss

**What:** Conditional component shown only when `?tag` is set. The × button navigates to `/?q={currentQ}` (removes tag, preserves keyword).

**Decision per UI-SPEC:** This is a small `'use client'` component (needs `router.push` for the × dismiss). Can be a separate file or inline in page.tsx — UI-SPEC says "or inline in page.tsx".

```typescript
// Source: UI-SPEC.md ActiveFilterChip spec + useRouter pattern
'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface Props {
  tag: string
  currentQ?: string
}

export default function ActiveFilterChip({ tag, currentQ }: Props) {
  const router = useRouter()

  function handleClear() {
    const params = new URLSearchParams()
    if (currentQ) params.set('q', currentQ)
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : '/')
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 mt-2">
      <span className="text-xs font-normal text-zinc-600">
        Active filter: {tag}
      </span>
      <button
        type="button"
        aria-label="Clear tag filter"
        onClick={handleClear}
        className="p-1 text-zinc-400 hover:text-zinc-700"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
```

### Pattern 6: Multi-Tag Query (tags per entry) in `searchEntries`

The raw SQL paths (Cases 3 and 4 in `searchEntries`) return one row per entry (FTS5 does not join tags). Tags must be fetched separately or via a second query. Two approaches:

**Approach A — Two queries (simpler, recommended):**
1. Run FTS5 query to get matching entry IDs and base fields.
2. Fetch tags for those entry IDs: `SELECT et.entry_id, t.name FROM entry_tags et JOIN tags t ON et.tag_id = t.id WHERE et.entry_id IN (...)`.
3. Merge in memory (same Map pattern as `getEntries()`).

**Approach B — Single query with GROUP_CONCAT:**
```sql
SELECT e.id, e.title, e.body, e.created_at,
       GROUP_CONCAT(t.name) as tag_list
FROM entries_fts
JOIN entries e ON entries_fts.rowid = e.id
LEFT JOIN entry_tags et ON e.id = et.entry_id
LEFT JOIN tags t ON et.tag_id = t.id
WHERE entries_fts MATCH ?
GROUP BY e.id
ORDER BY rank
```
Then split `tag_list` by comma. Simpler code but tag order is non-deterministic and GROUP_CONCAT ordering behavior varies.

**Recommendation:** Approach A (two queries). Consistent with the established `getEntries()` Map pattern. Deterministic tag ordering.

### Anti-Patterns to Avoid

- **Empty FTS5 MATCH:** Never call `MATCH ''` or `MATCH ?` with an empty string. FTS5 throws `fts5: syntax error near ""`. Always guard with `if (!hasQ) skip FTS5`.
- **Controlled input with async debounce:** Don't make `SearchInput` a controlled component (`value` prop). The debounce fires asynchronously; a controlled component re-renders on every URL change, causing cursor position issues and UI jank.
- **Forgetting to preserve the other param:** When `SearchInput` pushes `?q=`, it must read current `?tag=` from `useSearchParams` and include it. When `TagChip` pushes `?tag=`, it should preserve `?q=`. The UI-SPEC interaction contract specifies this explicitly.
- **`useSearchParams` without Suspense boundary:** In Next.js App Router, `useSearchParams()` inside a client component that is rendered during SSR requires the component to be wrapped in a `<Suspense>` boundary, or the entire page opts into dynamic rendering. For this app (home page is already dynamic due to `searchParams`), this is not a problem — but be aware.
- **`router.push` on every keypress:** Always debounce. Each `router.push` creates a history entry. Without debouncing, the user's back-button history fills with intermediate states.
- **FTS5 special characters crashing:** User input like `"hello` (unmatched quote) or `hello AND` (dangling operator) will cause FTS5 parse errors. Sanitize input before passing to MATCH.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-text search with ranking | Custom LIKE queries or client-side filter | SQLite FTS5 (already set up) | FTS5 is already deployed with triggers; BM25 ranking built in; `LIKE '%q%'` has no index |
| URL state management | React `useState` + `useEffect` syncing to URL | `useRouter` + `useSearchParams` (Next.js) | Native Next.js API; handles SSR/hydration correctly; no custom sync logic |
| Debounce implementation | Custom `setTimeout` abstraction | Inline `useRef` + `setTimeout` (as shown) | No library needed; the pattern is 4 lines; adding `use-debounce` is unnecessary for one use |
| Tag param encoding | Manual string escaping | `encodeURIComponent()` / `URLSearchParams` | Handles edge cases (spaces, ampersands, unicode) correctly |

**Key insight:** The search infrastructure (FTS5 virtual table + triggers) was built in Phase 1. Phase 4 is entirely about wiring it to the UI — the heavy lifting is already done.

---

## Common Pitfalls

### Pitfall 1: Empty FTS5 Query Crash

**What goes wrong:** `db.$client.prepare('SELECT ... WHERE entries_fts MATCH ?').all('')` throws `Error: fts5: syntax error near ""`. The app crashes on clearing the search box.

**Why it happens:** FTS5 MATCH requires at least one search token. An empty string is not valid FTS5 syntax.

**How to avoid:** Guard unconditionally: `const cleanQ = q?.trim() ?? ''; if (!cleanQ) { /* skip FTS5 path */ }`. This is a hard requirement in the success criteria.

**Warning signs:** Any code path where `cleanQ` could be `''` before the MATCH call.

---

### Pitfall 2: FTS5 Special Character Syntax Errors

**What goes wrong:** A user types `"react hooks` (unmatched quote), `hello AND`, or `item-1` (hyphen). FTS5 interprets these as query syntax operators and throws a parse error.

**Why it happens:** FTS5 has its own query language. Double-quotes delimit phrases, AND/OR/NOT are operators, hyphens exclude terms, `*` is a prefix wildcard.

**How to avoid:** Sanitize input before passing to MATCH. Simplest safe approach: strip all characters that are not alphanumeric, space, or hyphen (if hyphens in tags are common, allow them). Or wrap the entire query in double-quotes to force literal phrase matching: `MATCH '"' || replace(?, '"', '""') || '"'` (escape internal quotes by doubling).

**Warning signs:** Error messages containing "fts5: syntax error" in the server console.

---

### Pitfall 3: `useSearchParams()` Suspense Requirement

**What goes wrong:** Build warning or hydration error: `useSearchParams() should be wrapped in a suspense boundary`.

**Why it happens:** Next.js App Router requires client components that call `useSearchParams()` to be wrapped in `<Suspense>` when the component might be server-side rendered before hydration completes.

**How to avoid:** Wrap `<SearchInput>` in `<Suspense fallback={null}>` in `page.tsx`. Since `page.tsx` is already a dynamic Server Component (it reads `searchParams`), this is a safe no-op fallback.

**Warning signs:** Console warning during `next build` or hydration mismatch in dev.

---

### Pitfall 4: History Stack Pollution Without Debounce

**What goes wrong:** Each keypress creates a new browser history entry. Pressing backspace 10 times fills the history with 10 intermediate states. The back button becomes unusable.

**Why it happens:** `router.push` adds to history. Without debounce, every character change fires immediately.

**How to avoid:** 300ms debounce (as specified in CONTEXT.md D/UI-SPEC). Use `router.replace` instead of `router.push` if history entries for intermediate states are undesirable — but the CONTEXT.md specifies `router.push` for bookmarkability. Consider `router.replace` for intermediate typing states.

**Warning signs:** Pressing back navigates through individual characters typed.

**Refinement recommendation:** Use `router.replace` inside the debounce handler for intermediate keystrokes (since the debounced final value is what should be bookmarkable). The CONTEXT.md says "bookmarkable" — the final debounced result is bookmarked, not every intermediate state. `router.replace` is the correct choice here (Claude's discretion).

---

### Pitfall 5: `searchParams` Must Be Awaited in Next.js 15+

**What goes wrong:** `const { q } = searchParams` (synchronous access) causes a TypeScript error or runtime warning.

**Why it happens:** In Next.js 15 (and this project uses 16.2.6), `searchParams` is a Promise, not a plain object. The App Router made this change to enable partial prerendering.

**How to avoid:** Always `await searchParams`: `const { q, tag } = await searchParams`. The type annotation is `Promise<{ q?: string; tag?: string }>`.

**Warning signs:** TypeScript error "Property 'q' does not exist on type 'Promise<...>'" or runtime "params should be awaited" warning.

---

### Pitfall 6: Tags Not Returned with FTS5 Results

**What goes wrong:** `searchEntries()` returns entries with empty `tags: []` arrays when using the FTS5 code path.

**Why it happens:** The FTS5 query joins `entries_fts` to `entries`, but does not join `entry_tags` → `tags`. A LEFT JOIN to tags in the FTS5 query produces multiple rows per entry (one per tag), breaking ORDER BY rank.

**How to avoid:** Use the two-query approach: FTS5 query returns entry IDs; a second query fetches tags for those IDs using `WHERE entry_id IN (...)`. Merge with the Map pattern from `getEntries()`.

**Warning signs:** Entries shown without their tags in search results.

---

## Code Examples

Verified patterns from official sources:

### FTS5 content table query with BM25 ranking

```sql
-- Source: sqlite.org/fts5.html §10.1 (content tables) [CITED]
-- entries_fts is a content table backed by entries (content=entries, content_rowid=id)
-- 'rank' column returns BM25 score; lower is better rank (more negative = better match)
SELECT e.id, e.title, e.body, e.created_at
FROM entries_fts
JOIN entries e ON entries_fts.rowid = e.id
WHERE entries_fts MATCH ?
ORDER BY rank
```

### FTS5 query with tag filter (combined search)

```sql
-- Source: sqlite.org/fts5.html + sqlite.org/lang_select.html (JOIN) [CITED]
SELECT DISTINCT e.id, e.title, e.body, e.created_at
FROM entries_fts
JOIN entries e       ON entries_fts.rowid = e.id
JOIN entry_tags et   ON e.id = et.entry_id
JOIN tags t          ON et.tag_id = t.id
WHERE entries_fts MATCH ?
  AND t.name = ?
ORDER BY rank
```

### Fetch tags for a list of entry IDs (second query in two-query approach)

```sql
-- Source: existing getEntries() pattern in src/lib/actions.ts [VERIFIED: codebase]
SELECT et.entry_id, t.name
FROM entry_tags et
JOIN tags t ON et.tag_id = t.id
WHERE et.entry_id IN (/* parameterized list */)
```

Note: SQLite does not support array binding natively. Use `IN (${ids.map(() => '?').join(',')})` with spread args: `.all(...ids)`.

### URLSearchParams preservation pattern

```typescript
// Source: MDN URLSearchParams API [CITED: developer.mozilla.org/en-US/docs/Web/API/URLSearchParams]
// Preserve existing params when setting a new one:
const params = new URLSearchParams(searchParams.toString())
params.set('q', newValue)      // preserves ?tag= if present
router.replace(`/?${params.toString()}`)

// Remove a specific param, preserve others:
params.delete('tag')           // preserves ?q= if present
router.push(params.toString() ? `/?${params.toString()}` : '/')
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getServerSideProps` + `query` object | App Router `page.tsx` with `await searchParams` | Next.js 13 (App Router) | Server Component reads params natively; no `getServerSideProps` |
| `searchParams` as sync object | `searchParams` as `Promise<{...}>` | Next.js 15 | Must `await searchParams`; existing `page.tsx` must be updated |
| `router.query` (Pages Router) | `useSearchParams()` (App Router) | Next.js 13 | Hook-based; works in Client Components only |

**Deprecated/outdated:**
- `getServerSideProps`: Not used in App Router. Use async Server Components.
- `router.query` (from `next/router`): Pages Router only. Use `useSearchParams` from `next/navigation`.
- Synchronous `searchParams` access: Next.js 15+ requires `await`. The current `page.tsx` in this project does NOT yet use `searchParams` at all — it will need the prop added.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | FTS5 special-character sanitization: strip non-alphanumeric/space, or phrase-quote with escaped internal quotes | Pitfall 2, Pattern 1 | Wrong sanitization strategy could either allow crashes (too permissive) or discard valid search terms (too aggressive). Low risk — both strategies are safe fallbacks. |
| A2 | `router.replace` is preferable to `router.push` inside the debounce handler for intermediate states | Pitfall 4, Pattern 2 | If `router.push` is strictly required per project preference, history pollution occurs. The CONTEXT.md says "bookmarkable" which implies final state only — `replace` fits. |
| A3 | Two-query approach (FTS5 then tags) is preferred over GROUP_CONCAT for tag retrieval | Pattern 6 | If GROUP_CONCAT is used, tag ordering may vary. Risk is cosmetic only. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions

1. **FTS5 query sanitization strategy**
   - What we know: FTS5 throws on special characters; multiple sanitization strategies are valid.
   - What's unclear: Whether the project prefers phrase-quoting (preserves multi-word intent) vs. stripping (simpler).
   - Recommendation: Default to phrase-quoting with internal quote escaping — it's more user-friendly for multi-word searches like `react hooks`.

2. **`router.push` vs `router.replace` for search input**
   - What we know: CONTEXT.md says "bookmarkable results"; `router.push` creates history entries per debounce fire.
   - What's unclear: Whether intermediate debounced states should be in history.
   - Recommendation: Use `router.replace` for the debounce handler — the final search state remains addressable, but intermediate states don't pollute history.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | better-sqlite3, Next.js | ✓ | (project running) | — |
| SQLite FTS5 | `searchEntries()` FTS5 paths | ✓ | Built-in since SQLite 3.9 (2015); macOS ships 3.39+ | — |
| lucide-react | SearchInput Search icon, ActiveFilterChip X icon | ✓ | 1.16.0 (in package.json) | — |
| next/navigation `useSearchParams` | SearchInput, ActiveFilterChip | ✓ | Next.js 16.2.6 | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run tests/search.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | Keyword search returns matching entries | unit | `npx vitest run tests/search.test.ts` | ❌ Wave 0 |
| SRCH-01 | Debounce fires after 300ms, not per keypress | manual | — | manual only |
| SRCH-01 | Empty string returns all entries (no FTS5 crash) | unit | `npx vitest run tests/search.test.ts` | ❌ Wave 0 |
| SRCH-02 | Tag filter returns only entries with that tag | unit | `npx vitest run tests/search.test.ts` | ❌ Wave 0 |
| SRCH-02 | TagChip click navigates to `/?tag=name` | manual | — | manual only |
| SRCH-03 | Combined q+tag returns intersection | unit | `npx vitest run tests/search.test.ts` | ❌ Wave 0 |
| SRCH-03 | Clearing tag preserves keyword in URL | manual | — | manual only |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/search.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/search.test.ts` — covers SRCH-01 (FTS5 queries, empty guard), SRCH-02 (tag filter), SRCH-03 (combined)

Test pattern: in-memory SQLite with FTS5 virtual table + triggers (same pattern as `tests/actions.test.ts` but extended with FTS5 CREATE VIRTUAL TABLE in the beforeEach setup).

*(Existing `tests/actions.test.ts` and `tests/tag-normalize.test.ts` — no changes needed; not FTS5-related.)*

---

## Security Domain

> `security_enforcement` not set to false in config — section included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user local app, no auth |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No multi-user, localhost only |
| V5 Input Validation | yes | Sanitize `q` before FTS5 MATCH; validate `tag` is a string before SQL binding |
| V6 Cryptography | no | No secrets, no encryption needed |

### Known Threat Patterns for SQLite FTS5 + URL params

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| FTS5 query injection | Tampering | Always use parameterized queries (`prepare().all(?)`); never interpolate user input into SQL string |
| URL param injection (XSS) | Tampering | Next.js Server Components render `searchParams` values as text (React escapes by default); no `dangerouslySetInnerHTML` used |
| Unbounded query results | Denial of Service | FTS5 with BM25 ranking naturally limits relevance; consider `LIMIT 200` for safety on large journals |

**Note on SQL injection:** The `MATCH ?` parameterized form is safe against SQL injection. FTS5 syntax errors (from special characters) are a separate concern addressed by input sanitization — these cause application errors, not data exposure.

---

## Sources

### Primary (HIGH confidence)

- SQLite FTS5 documentation — `sqlite.org/fts5.html` — FTS5 query syntax, content tables, BM25 ranking, empty query behavior [CITED]
- Next.js App Router `searchParams` docs — `nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional` — async searchParams in Next.js 15+ [CITED]
- Next.js `useSearchParams` docs — `nextjs.org/docs/app/api-reference/functions/use-search-params` — Suspense requirement, client component usage [CITED]
- Existing codebase — `src/lib/db/index.ts`, `src/lib/actions.ts`, `src/components/delete-button.tsx`, `src/app/page.tsx`, `src/components/tag-chip.tsx` — established patterns for raw SQL, Drizzle JOIN, `useRouter`, component structure [VERIFIED: codebase]
- `04-CONTEXT.md` — locked decisions D-01 through D-10 [VERIFIED: codebase]
- `04-UI-SPEC.md` — component specs, copy, spacing, interaction contract [VERIFIED: codebase]
- `package.json` — confirmed versions: Next.js 16.2.6, vitest 4.1.7, lucide-react 1.16.0 [VERIFIED: codebase]

### Secondary (MEDIUM confidence)

- MDN URLSearchParams API — `developer.mozilla.org/en-US/docs/Web/API/URLSearchParams` — param preservation pattern [CITED]

### Tertiary (LOW confidence)

- None — all claims are verified from codebase or cited from official documentation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new dependencies
- Architecture: HIGH — patterns derived directly from existing codebase; decisions locked in CONTEXT.md
- FTS5 behavior: HIGH — SQLite FTS5 docs cited; empty-query guard is a documented hard requirement
- Client component patterns: HIGH — `useRouter`/`useSearchParams` pattern verified in existing delete-button.tsx; Next.js docs cited
- Pitfalls: HIGH — FTS5 crash is a known documented behavior; searchParams async is a documented Next.js 15+ change

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (stable stack; Next.js 16.x, SQLite FTS5 are not fast-moving)
