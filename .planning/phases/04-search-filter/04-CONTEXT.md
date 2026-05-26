# Phase 4: Search & Filter - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers the find experience: users can search entries by keyword, filter by tag, or combine both simultaneously. The home page gains a search input and tag filter controls. After this phase, all v1 requirements are complete — the app is writable, readable, and searchable.

No new routes, no new entry CRUD, no pagination — this phase is purely additive to the home page and the TagChip component.

</domain>

<decisions>
## Implementation Decisions

### Search State Architecture
- **D-01:** Use **URL search params** (`?q=keyword&tag=project-name`) for search state. The home page remains a Server Component — it reads `searchParams` and passes them to `searchEntries()`. Back/forward navigation works; results are bookmarkable.
- **D-02:** URL shape: `/?q=keyword` for text search, `/?tag=project-name` for tag filter, `/?q=keyword&tag=project-name` for combined. Both params are optional; absent means no filter.
- **D-03:** A single `searchEntries(q, tag)` Server Action handles all cases — returns all entries when both params are empty (replaces `getEntries()` on the home page). The existing `getEntries()` remains available for any non-home usage.
- **D-04:** The search input is a standalone **`SearchInput` client component** (`'use client'`) that uses `useRouter` and `useSearchParams` with debounced `router.push`. The home page stays a Server Component — it renders `<SearchInput defaultValue={q} />` alongside the server-rendered entry list. Minimal client surface.

### Search Bar Placement
- **D-05:** The search input lives **inline on the home page only** — above the entry list, below the header. `AppHeader` is unchanged (logo + New Entry button). Other pages (entry detail, editor) are unaffected.
- **D-06:** When a search or tag filter is active, display a **result count label** ("3 entries", "12 entries") between the search input and the entry list. Visible only when q or tag is set.
- **D-07:** When search/filter returns no results, display a contextual empty-state message. Wording is at Claude's discretion (e.g., "No entries match "{query}"" / "No entries tagged "{tag}"").

### Tag Filter UX
- **D-08:** **TagChip becomes a navigating client component** — clicking any TagChip navigates to `/?tag={name}`. This applies on all pages where TagChip appears: EntryCard (home list) and entry detail page. `EditorTagChip` (delete-only, editor-specific) is unaffected.
- **D-09:** When `?tag` is set, display an **active filter chip** ("Active filter: frontend ×") above the entry list (between search bar and results). Clicking × clears the tag param. This is the primary affordance for dismissing the filter.
- **D-10:** TagChip must become a `'use client'` component to support `router.push`. The existing non-interactive `span` wrapper is replaced.

### Claude's Discretion
- Exact debounce delay for search input (suggested: 300ms — shorter than autosave, fast enough for live feel).
- Exact empty-state copy for no-results states (keyword and tag variants).
- Whether `SearchInput` and the active filter chip are a single component or two adjacent components.
- Internal FTS5 query construction: whether to handle special characters gracefully (e.g., strip or escape FTS5 syntax characters from user input before querying).
- Visual styling of the active filter chip (suggest: similar to TagChip but with a muted background and × button, distinct from entry-level TagChips).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — SRCH-01 (live keyword search), SRCH-02 (tag filter), SRCH-03 (combined search + filter); all targeted by Phase 4
- `.planning/ROADMAP.md` §Phase 4 — Success criteria (4 items) including the empty-FTS5-query guard

### Stack Decisions (locked in Phase 1)
- `CLAUDE.md` §Database Layer — FTS5 virtual table (`entries_fts`) created via raw SQL in `initSchema()`; queried with `WHERE entries_fts MATCH ?`; BM25 ranking via `rank` column
- `CLAUDE.md` §Server Actions vs API Routes — mutations and queries use `'use server'` actions; `revalidatePath('/')` after mutations
- `CLAUDE.md` §Full-Text Search — FTS5 built into SQLite; use `MATCH ?` for queries; guard against empty query (empty FTS5 MATCH throws)

### Existing Implementation
- `src/lib/actions.ts` — `getEntries()` pattern to follow for new `searchEntries(q, tag)`; `EntryListItem` type already defined
- `src/lib/db/schema.ts` — `entries`, `tags`, `entryTags` table definitions; FTS5 table is raw SQL only (not in Drizzle schema)
- `src/app/page.tsx` — current home page; will receive `searchParams` prop and `<SearchInput>` component
- `src/components/tag-chip.tsx` — current non-interactive component; Phase 4 upgrades it to navigating client component
- `src/components/entry-card.tsx` — uses TagChip; will automatically gain click behavior when TagChip updates

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TagChip` (`src/components/tag-chip.tsx`): Non-interactive `<span>`. Phase 4 converts it to a `'use client'` component with `router.push('/?tag=' + name)`. All existing usages (EntryCard, detail page) get click behavior automatically.
- `EntryCard` (`src/components/entry-card.tsx`): Server Component rendering title, date, snippet, and tags. No changes needed — TagChip upgrade flows through.
- `AppHeader` (`src/components/app-header.tsx`): Unchanged in Phase 4. Logo left + New Entry right.
- `getEntries()` in `src/lib/actions.ts`: The JOIN pattern (entries → entry_tags → tags) will be reused inside `searchEntries()` for the tag-filtered query path.

### Established Patterns
- Home page is an async Server Component — `searchParams` is available as a prop in Next.js App Router page components.
- `'use client'` components are used sparingly (editor, delete button, editor tag chips) — new `SearchInput` and updated `TagChip` follow this pattern.
- FTS5 is queried via raw SQL through `db.$client.prepare(...)` (not Drizzle ORM — Drizzle has no FTS5 support). Pattern established in `initSchema()`.
- `revalidatePath('/')` is called after all mutations — search is read-only, so no revalidation needed in `searchEntries()`.

### Integration Points
- `src/app/page.tsx` receives `{ searchParams }` prop → extracts `q` and `tag` → passes to `searchEntries()` → renders `<SearchInput defaultValue={q} />` + optional active filter chip + entry list.
- `src/components/tag-chip.tsx` gains `router.push` — this propagates to every page that renders tags (EntryCard on home, entry detail page at `src/app/entries/[id]/page.tsx`).

</code_context>

<specifics>
## Specific Ideas

- **FTS5 empty guard** is a hard requirement from the ROADMAP.md success criteria: "Searching for an empty string or clearing the search returns all entries (no crash on empty FTS5 query)." Implementation must branch on empty `q` and skip the `MATCH` clause entirely.
- **Result count** is shown only when a filter is active (q or tag set), not on the unfiltered home page.
- **Active filter chip** sits between the search bar and the entry list — appears only when `?tag` is set.

</specifics>

<deferred>
## Deferred Ideas

- **Search result snippet highlighting** (matching text bolded) — REQUIREMENTS.md lists this as V2-SRCH-01. Not in Phase 4.
- **Tag autocomplete** when typing a new tag — V2-SRCH-02. Not in Phase 4.
- **Entry count per tag** visible in a tag list — V2-VIEW-02. Not in Phase 4.

</deferred>

---

*Phase: 4-Search & Filter*
*Context gathered: 2026-05-26*
