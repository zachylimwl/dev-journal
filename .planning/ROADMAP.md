# Roadmap: Dev Journal

## Milestones

- ✅ **v1.0 MVP** — Phases 1–4 (shipped 2026-05-27) — [archive](milestones/v1.0-ROADMAP.md)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–4, shipped 2026-05-27)</summary>

### Phase 1: Foundation
**Goal**: Working data layer and Next.js scaffold that compiles and smoke-tests cleanly
**Completed:** 2026-05-22 | **Plans:** 2/2
- [x] 01-01-PLAN.md — Scaffold Next.js project, configure serverExternalPackages, build DB layer (schema.ts + globalThis singleton + drizzle.config.ts)
- [x] 01-02-PLAN.md — Wire Server Actions stub + home page, run drizzle-kit push, verify full schema and Walking Skeleton end-to-end

### Phase 2: Read Loop
**Goal**: Users can browse and read all entries with fully rendered Markdown
**Completed:** 2026-05-25 | **Plans:** 2/2
- [x] 02-01-PLAN.md — Install react-markdown/remark-gfm/rehype-highlight/@tailwindcss/typography, create format utilities, extend Server Actions
- [x] 02-02-PLAN.md — Build AppHeader, EntryCard, TagChip, MarkdownBody; wire home page and layout; create entry detail page

### Phase 3: Write Loop
**Goal**: Users can create, edit, delete, and tag entries with autosave — the app is daily-usable
**Completed:** 2026-05-26 | **Plans:** 4/4
- [x] 03-01-PLAN.md — Install @uiw/react-md-editor + shadcn AlertDialog; set up Vitest with unit tests
- [x] 03-02-PLAN.md — Add createEntry, updateEntry, deleteEntry, setEntryTags Server Actions; "New Entry" button
- [x] 03-03-PLAN.md — Build EditorTagChip + EditorForm with autosave debounce; wire /new and /entries/[id]/edit pages
- [x] 03-04-PLAN.md — Build DeleteButton with AlertDialog; add Edit + Delete to detail and edit pages

### Phase 4: Search & Filter
**Goal**: Users can find any past entry by keyword, by tag, or by both simultaneously
**Completed:** 2026-05-27 | **Plans:** 3/3
- [x] 04-01-PLAN.md — Implement searchEntries(q, tag) with FTS5 guard, four query branches; TDD test suite
- [x] 04-02-PLAN.md — Create SearchInput (debounced), ActiveFilterChip; upgrade TagChip to navigating button
- [x] 04-03-PLAN.md — Wire page.tsx: searchParams, searchEntries(), SearchInput + result count + ActiveFilterChip + empty states

</details>

---

## Progress

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1.0 MVP | 1–4 (11 plans) | ✅ Complete | 2026-05-27 |

**v1 requirements delivered: 12/12** — see [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

---
*Created: 2026-05-21*
*v1.0 archived: 2026-05-27*
