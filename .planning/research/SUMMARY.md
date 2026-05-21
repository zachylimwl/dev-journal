# Research Summary: Dev Journal

**Synthesized:** 2026-05-21
**Overall confidence:** HIGH

---

## Executive Summary

Single-user, localhost-only personal developer journal built with Next.js App Router, better-sqlite3 + Drizzle ORM, and SQLite FTS5 for search. No auth, no API layer, no client-side data fetching. Server Components read directly from SQLite; Server Actions handle all writes.

The key risks are all in Phase 1: native module bundling failure, HMR connection leaks, and DB file path divergence. Each is a one-line fix once known; each is a multi-hour debug spiral if encountered cold. Address all three on day one before writing any feature code.

---

## Recommended Stack

| Layer | Library | Version | Rationale |
|-------|---------|---------|-----------|
| Framework | Next.js | 16.2.6 | App Router; Server Actions eliminate API boilerplate |
| Language | TypeScript | 5.x | Default; catches schema drift |
| DB driver | better-sqlite3 | 12.10.0 | Synchronous API correct for Server Actions; fastest SQLite for Node |
| ORM | Drizzle ORM | 0.45.2 | TypeScript-native, thin, pairs with better-sqlite3 |
| Migration CLI | drizzle-kit | 0.31.10 | Schema-first; push workflow for local dev |
| Styling | Tailwind CSS | 4.3.0 | Zero runtime; v4 current stable |
| Components | shadcn/ui | 2.9.0 | Copy-paste primitives; no bundle overhead |
| Markdown editor | @uiw/react-md-editor | 4.1.0 | Markdown-native (raw string I/O); load via `dynamic()` `ssr:false` |
| Markdown renderer | react-markdown | 10.1.0 | React elements, no `dangerouslySetInnerHTML` |
| GFM plugin | remark-gfm | 4.0.1 | Tables, strikethrough, task lists |
| Syntax highlight | rehype-highlight | 7.0.2 | highlight.js classes on fenced code |
| Search | SQLite FTS5 built-in | — | Zero deps; BM25 ranking; bundled in better-sqlite3 |

**Do NOT use:** Prisma (50MB binary, overkill), TipTap (JSON model, not Markdown-native), marked/markdown-it (`dangerouslySetInnerHTML`), LIKE queries (no index, no ranking), Edge runtime (breaks better-sqlite3 native addon).

---

## Table Stakes Features (V1)

In build order:
1. Create entry with Markdown body + tags
2. Autosave — debounced ~500ms; without it daily use is anxious
3. Entry list: newest first, date + 80-120 char preview snippet
4. Tag filter — flat tags, click-to-filter
5. Full-text search — live on keypress, 150-300ms debounce
6. Combined search + tag filter
7. Delete with confirmation modal
8. Syntax-highlighted code blocks in rendered view
9. Entry detail with rendered Markdown

**Deliberate anti-features — do not build:** rich text toolbar, cloud sync, auth, collaboration, nested tags, file attachments, templates, pinning, revision history, export wizards, multiple notebooks.

---

## Architecture

Seven structural decisions:

1. **App Router + Server Components** — data-fetching is server-side; only editor textarea, search input, and tag chips are Client Components
2. **Server Actions for all mutations** — all CRUD in `app/actions.ts`; calls `revalidatePath` after each write; no API routes
3. **URL as search/filter state** — `SearchBar` and `TagFilter` push to URL params; no client state management needed
4. **Junction table for tags** (`entry_tags`) — not JSON array, not comma-separated; enables indexed lookups
5. **FTS5 content table + triggers** — `CREATE VIRTUAL TABLE entries_fts USING fts5(title, content, content='entries', content_rowid='id')` with INSERT/UPDATE/DELETE triggers
6. **globalThis singleton** — `global.__db ?? (global.__db = new Database(DB_PATH))` — survives HMR re-evaluation
7. **Schema initialized at connection time** — `CREATE TABLE IF NOT EXISTS` on first open; zero setup on fresh machine

**File structure:**
```
app/
  layout.tsx              root layout, sidebar shell
  page.tsx                home: entry list (Server Component)
  actions.ts              all Server Actions
  entries/[id]/page.tsx   entry detail (Server Component)
  entries/[id]/edit/      edit form (Client Component)
  search/page.tsx         search results (Server Component, reads searchParams)

components/
  EntryList.tsx           Server Component
  EntryCard.tsx           Server Component (date + snippet)
  EntryEditor.tsx         Client Component (markdown editor + tag input)
  EntryViewer.tsx         renders Markdown (react-markdown + plugins)
  SearchBar.tsx           Client Component (controlled → URL push)
  TagFilter.tsx           Client Component (chips → URL push)

lib/
  db.ts                   singleton + all query functions
  schema.ts               CREATE TABLE + FTS5 triggers
  types.ts                Entry, Tag, SearchResult interfaces
```

---

## Critical Pitfalls

**Address Phase 1 Day 1:**

| Pitfall | Prevention |
|---------|-----------|
| better-sqlite3 bundling failure | `serverExternalPackages: ['better-sqlite3']` in `next.config.js`; verify with `next build` |
| HMR creates multiple connections | `global.__db` singleton pattern in `lib/db.ts` |
| DB file path diverges in build | Always `path.join(process.cwd(), 'journal.db')` — never `__dirname` |
| FTS5 out of sync | Content table mode + INSERT/UPDATE/DELETE triggers at schema creation |

**Address when building the feature:**

| Pitfall | Phase | Prevention |
|---------|-------|-----------|
| Editor state mismatch | Write loop | `useState(entry?.content ?? '')` reset only on `entry.id` change |
| FTS5 crashes on `C++`, empty string, `"quoted"` | Search | Wrap query in `"..."` phrase literal; return all entries on empty query |
| Tailwind `prose` bleeding into code blocks | Read loop | `prose-pre:p-0 prose-pre:bg-transparent`; test all Markdown types early |
| Tag normalization | Write loop | Trim + lowercase + deduplicate + filter empty in Server Action |
| Autosave race on navigate-away | Write loop | `useRef` to flush debounce on `beforeunload` |

---

## Recommended Build Order (4 Phases)

**Phase 1: Foundation**
- `next.config.js` with `serverExternalPackages`
- `lib/db.ts` globalThis singleton + `process.cwd()` path
- `lib/schema.ts` — entries, tags, entry_tags tables + FTS5 virtual table + 3 triggers
- `lib/types.ts` — TypeScript interfaces
- All query functions in `lib/db.ts`
- `app/actions.ts` — Server Actions + `revalidatePath`
- `next build` smoke test
- Delivers: working data layer; nothing visible yet

**Phase 2: Read Loop**
- `app/layout.tsx` sidebar shell
- Entry list, entry card, entry detail pages
- `EntryViewer` — react-markdown + remark-gfm + rehype-highlight
- Tailwind prose + syntax highlighter compatibility check
- Delivers: can read entries; Markdown renders correctly

**Phase 3: Write Loop**
- `EntryEditor` — @uiw/react-md-editor via `dynamic()` with local state pattern
- New + edit pages; tag input with Server Action normalization
- Autosave debounced 500ms + `beforeunload` flush
- Delete with confirmation modal; Cmd/Ctrl+N shortcut
- Delivers: full CRUD; daily-usable app

**Phase 4: Search and Filter**
- `SearchBar` — controlled input → `router.push`
- `TagFilter` — tag chips → URL params
- `app/search/page.tsx` — reads `searchParams`, calls `searchEntries`
- FTS5 query sanitizer (wraps in `"..."`, handles empty string)
- Combined search + tag filter JOIN query; tag entry counts
- Delivers: find anything; productivity loop complete

---

## Open Questions for Planning

- Co-locate `journal.db` in project root or `.data/` directory? (affects `.gitignore`)
- `drizzle-kit push` (simpler) vs `drizzle-kit generate` + migrate (audit trail)?
- Exact debounce values: 150-500ms range; validate by feel in development
- `@uiw/react-md-editor` dark mode with Tailwind v4 CSS variables — untested combination
- Drizzle typed query builder vs raw `db.prepare()` — decide in Phase 1, stay consistent
