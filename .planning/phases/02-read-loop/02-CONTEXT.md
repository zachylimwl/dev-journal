# Phase 2: Read Loop - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the read-only experience: a home page entry list and a full-entry detail page with formatted Markdown and syntax-highlighted code blocks. Users can browse all entries and read any entry in full. No create/edit/delete functionality — that is Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Entry List Card Layout
- **D-01:** Each card shows: title + date + snippet + tags (requires JOIN with `entry_tags` in `getEntries()`)
- **D-02:** Preview snippet length: ~300 characters (3–4 lines) — truncated from `body` on the server
- **D-03:** Date format: relative + absolute (e.g. "2 days ago — May 23, 2026") — both values computed server-side at request time
- **D-04:** Visual style: divider-separated rows (no card box, no shadow/border) — horizontal rule between entries

### Syntax Highlighting
- **D-05:** Theme: GitHub Dark (`highlight.js/styles/github-dark.css`) — fixed, always dark regardless of OS preference
- **D-06:** No adaptive dark/light switching — a single CSS import; no media query override needed

### Reading Layout Width
- **D-07:** Both home page (list) and entry detail page use `max-w-5xl mx-auto` — same constraint on both for visual consistency
- **D-08:** No full-width layout — content is always constrained to keep the reading experience comfortable on wide monitors

### App Header / Chrome
- **D-09:** Persistent minimal header: "Dev Journal" title only, added to `src/app/layout.tsx` so all pages inherit it
- **D-10:** Phase 3 will slot a "New Entry" button into this header — layout structure must accommodate a right-side action slot
- **D-11:** Entry detail page includes a "← All entries" back link above the entry content (not relying solely on browser back button)

### Claude's Discretion
- Exact Tailwind classes for the header (font size, padding, border-bottom) — keep it minimal and functional
- Snippet generation strategy: strip Markdown syntax chars before truncating (so snippets show plain text, not `##` or `**`)
- Snippet ellipsis handling: truncate at word boundary, append `…`
- Relative date implementation: compute server-side using request timestamp vs `created_at`; no client-side JS required (avoids hydration mismatch)
- `@tailwindcss/typography` prose plugin for Markdown body — apply `prose` class to entry detail content; override code block defaults to prevent style bleeding (SC-4)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` §Viewing — VIEW-01, VIEW-02, VIEW-03 are the three requirements this phase satisfies
- `.planning/ROADMAP.md` §"Phase 2: Read Loop" — success criteria (4 items), phase dependencies, UI hint flag

### Stack Decisions (locked in Phase 1)
- `CLAUDE.md` §"Markdown Rendering" — `react-markdown` + `remark-gfm` + `rehype-highlight` locked; `marked`/raw HTML forbidden
- `CLAUDE.md` §"Key Decisions Explained" — `better-sqlite3` sync API, Server Actions over API Routes, Drizzle ORM patterns
- `CLAUDE.md` §"What NOT to Use" — explicit blocklist (Prisma, marked, LIKE search, Edge runtime)

### Existing Phase 1 Code
- `src/lib/actions.ts` — `getEntries()` stub needs: `ORDER BY created_at DESC`, snippet generation (300 chars), JOIN with `entry_tags`
- `src/lib/db/schema.ts` — `entries`, `tags`, `entryTags` table definitions; FTS5 virtual table excluded by design
- `src/lib/db/index.ts` — DB singleton (globalThis pattern); auto-init on first import
- `src/app/layout.tsx` — Root layout; persistent header goes here
- `src/app/page.tsx` — Home page Server Component stub; Phase 2 replaces its body

### External Library Docs (to install in Phase 2)
- `react-markdown` (v10) — primary Markdown renderer; SSR-safe, React element output
- `remark-gfm` (v4) — GFM support plugin (tables, task lists, strikethrough)
- `rehype-highlight` (v7) — syntax highlighting via highlight.js class injection
- `highlight.js` CSS theme: `github-dark` — import path: `highlight.js/styles/github-dark.css`
- `@tailwindcss/typography` — `prose` utility class for Markdown body; needed to satisfy SC-4 (no style bleed into code blocks)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db/index.ts`: DB singleton already initialized; Phase 2 imports it via `actions.ts` — no new DB setup needed
- `src/lib/actions.ts` `getEntries()`: exists as a stub — extend with ORDER BY, snippet, and tags JOIN rather than replacing
- `src/app/layout.tsx`: Geist Sans + Geist Mono fonts already configured; `min-h-full flex flex-col` body — header slots above `{children}`

### Established Patterns
- Server Components only (no `'use client'`) for data-fetching pages — `page.tsx` must remain a Server Component
- `'use server'` module for all DB operations (`actions.ts`) — Phase 2 adds `getEntryById(id)` following the same pattern
- Drizzle `.select().from(table).all()` query pattern — Phase 2 extends with `.orderBy(desc(entries.createdAt))` and a LEFT JOIN

### Integration Points
- New route `src/app/entries/[id]/page.tsx` → calls `getEntryById(id)` from `actions.ts` → reads from `entries` + `entry_tags` + `tags`
- `layout.tsx` → persistent header renders above all pages (list + detail)
- `getEntries()` needs a tagged-entries JOIN: `db.select({...}).from(entries).leftJoin(entryTags, ...).leftJoin(tags, ...).orderBy(desc(entries.createdAt)).all()` — group results by entry ID client-side or use a subquery

</code_context>

<specifics>
## Specific Ideas

- The entry list should feel like a developer's log — divider-separated rows read more like a log file or changelog than a social feed
- "← All entries" link on detail page — uses Next.js `<Link href="/">` (not `router.back()`) for reliability
- Snippet strips Markdown before displaying — showing `## My Heading` in a snippet is noisy

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Read Loop*
*Context gathered: 2026-05-25*
