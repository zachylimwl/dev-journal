# Roadmap: Dev Journal

**Project:** Dev Journal
**Core Value:** A fast place to write and later find anything you've worked on — entries writable in seconds and searchable in seconds
**Granularity:** Standard
**Mode:** yolo (mvp)
**Created:** 2026-05-21

---

## Phases

- [x] **Phase 1: Foundation** - DB layer, schema, Server Actions scaffold — nothing visible yet (completed 2026-05-22)
- [x] **Phase 2: Read Loop** - Entry list, entry detail, and Markdown rendering with syntax highlighting (completed 2026-05-25)
- [ ] **Phase 3: Write Loop** - Full entry CRUD, autosave, and tag management
- [ ] **Phase 4: Search & Filter** - FTS5 keyword search, tag filter, and combined query

---

## Phase Details

### Phase 1: Foundation
**Goal**: Working data layer and Next.js scaffold that compiles and smoke-tests cleanly
**Mode:** mvp
**Depends on**: Nothing
**Requirements**: *(infrastructure phase — no user-facing v1 requirements; enables all subsequent phases)*
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts without errors and `next build` completes successfully
  2. `journal.db` is created automatically on first run with correct schema (entries, tags, entry_tags, FTS5 table, triggers)
  3. All Server Actions are reachable (no import or bundling errors for better-sqlite3)
  4. HMR restarts do not create multiple DB connections (globalThis singleton verified)
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js project, configure serverExternalPackages, build DB layer (schema.ts + globalThis singleton + drizzle.config.ts)
- [x] 01-02-PLAN.md — Wire Server Actions stub + home page, run [BLOCKING] drizzle-kit push, verify full schema and Walking Skeleton end-to-end

### Phase 2: Read Loop
**Goal**: Users can browse and read all entries with fully rendered Markdown
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: VIEW-01, VIEW-02, VIEW-03
**Success Criteria** (what must be TRUE):
  1. Home page shows all entries newest-first, each with its date and a preview snippet
  2. Clicking an entry opens the full entry rendered as formatted Markdown (headings, lists, bold, italic, links)
  3. Fenced code blocks render with syntax highlighting (language-specific colors)
  4. Tailwind prose styles do not bleed into code block padding or background
**Plans**: 2 plans

Plans:

**Wave 1**
- [x] 02-01-PLAN.md — Install react-markdown/remark-gfm/rehype-highlight/@tailwindcss/typography, configure globals.css, create format utilities, extend Server Actions with getEntries() + getEntryById()

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-02-PLAN.md — Build AppHeader, EntryCard, TagChip, MarkdownBody components; wire home page and layout; create entry detail page with 404 handling

**Cross-cutting constraints:**
- All Phase 2 files are React Server Components — no `'use client'` directive
- `highlight.js/styles/github-dark.css` imported once in `globals.css` only — not in components
- `prose-pre:p-0 prose-pre:bg-transparent` required on `<article>` to prevent Tailwind typography bleed

### Phase 3: Write Loop
**Goal**: Users can create, edit, delete, and tag entries with autosave — the app is daily-usable
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: ENTR-01, ENTR-02, ENTR-03, ENTR-04, TAG-01, TAG-02
**Success Criteria** (what must be TRUE):
  1. User can create a new entry with a title and free-form Markdown body — entry appears in the list immediately
  2. User can edit any existing entry and changes persist without pressing a Save button (autosave fires ~500ms after last keystroke)
  3. User can delete an entry after confirming a prompt — entry is removed from the list
  4. User can add or remove project tags on any entry; tags appear on the entry card and detail view
  5. Tags are stored normalized (trimmed, lowercased, deduplicated, empties removed) regardless of how they were typed
**Plans**: 4 plans

Plans:

**Wave 0**
- [x] 03-01-PLAN.md — Install @uiw/react-md-editor + shadcn AlertDialog bootstrap; set up Vitest with tag normalization and Server Action unit tests

**Wave 1** *(blocked on Wave 0 completion)*
- [ ] 03-02-PLAN.md — Add createEntry, updateEntry, deleteEntry, setEntryTags Server Actions; add "New Entry" button to AppHeader

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 03-03-PLAN.md — Build EditorTagChip + EditorForm client component with autosave debounce; wire /new and /entries/[id]/edit pages

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 03-04-PLAN.md — Build DeleteButton with AlertDialog; add Edit + Delete to detail page and Delete to edit page (D-10)

**Cross-cutting constraints:**
- No `'use client'` at page level — pages stay Server Components; EditorForm and DeleteButton are Client Components
- `@uiw/react-md-editor` CSS imported in editor-form.tsx only (not globals.css) — prevents prose style bleed on detail page
- `createEntry` returns `{ id: number }` to Client Component; Client Component calls `router.replace()` — never `redirect()` inside Server Action for autosave
- Race condition guard: `entryIdRef.current = -1` sentinel while createEntry is in flight; only call createEntry if value is `null`
- Tags normalized client-side on chip creation AND server-side in setEntryTags (double normalization guard)

### Phase 4: Search & Filter
**Goal**: Users can find any past entry by keyword, by tag, or by both simultaneously
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: SRCH-01, SRCH-02, SRCH-03
**Success Criteria** (what must be TRUE):
  1. Typing in the search bar shows matching entries in real time (updates on keypress, debounced)
  2. Clicking a tag chip filters the entry list to entries with that tag only
  3. Keyword search and tag filter can be active at the same time, narrowing results to entries that match both
  4. Searching for an empty string or clearing the search returns all entries (no crash on empty FTS5 query)
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete   | 2026-05-22 |
| 2. Read Loop | 2/2 | Complete   | 2026-05-25 |
| 3. Write Loop | 1/4 | In Progress|  |
| 4. Search & Filter | 0/? | Not started | - |

---

## Coverage

| Requirement | Phase |
|-------------|-------|
| VIEW-01 | Phase 2 |
| VIEW-02 | Phase 2 |
| VIEW-03 | Phase 2 |
| ENTR-01 | Phase 3 |
| ENTR-02 | Phase 3 |
| ENTR-03 | Phase 3 |
| ENTR-04 | Phase 3 |
| TAG-01 | Phase 3 |
| TAG-02 | Phase 3 |
| SRCH-01 | Phase 4 |
| SRCH-02 | Phase 4 |
| SRCH-03 | Phase 4 |

**v1 requirements mapped: 12/12**

---
*Created: 2026-05-21*
*Phase 1 planned: 2026-05-22*
*Phase 2 planned: 2026-05-25*
*Phase 2 completed: 2026-05-25*
