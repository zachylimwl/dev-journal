# Milestones: Dev Journal

---

## ✅ v1.0 MVP — Shipped 2026-05-27

**Timeline:** 2026-05-21 → 2026-05-27 (6 days)
**Phases:** 4 | **Plans:** 11 | **Commits:** 102 | **Files:** 109 | **Lines added:** ~32,361

### What shipped

Full personal developer journal — write Markdown entries, tag by project, search and filter instantly.

| Phase | Name | Delivered |
|-------|------|-----------|
| 1 | Foundation | Next.js scaffold + SQLite DB layer + FTS5 index + globalThis singleton |
| 2 | Read Loop | Entry list with previews, full entry detail, react-markdown with syntax highlighting |
| 3 | Write Loop | Full CRUD, @uiw/react-md-editor autosave (2s debounce), tag normalization, AlertDialog delete |
| 4 | Search & Filter | FTS5 searchEntries() (TDD, 18 tests), debounced SearchInput, TagChip navigation, URL-as-state |

### Key accomplishments

1. SQLite + Drizzle ORM data layer with FTS5 full-text search, content table triggers, and HMR-safe globalThis singleton
2. React Markdown rendering with `remark-gfm` + `rehype-highlight` (GitHub Dark theme) — no dangerouslySetInnerHTML
3. `@uiw/react-md-editor` split-pane editor with 2s autosave debounce and race condition guard
4. FTS5 `searchEntries()` covering 4 query branches (empty, keyword, tag, combined) with mandatory empty-query guard
5. URL-as-state search/filter pattern — Server Component re-render driven by `searchParams`, no client state
6. 33-test Vitest suite covering tag normalization, Server Action mutations, and FTS5 branch coverage

### Requirements

12/12 v1 requirements delivered. See [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) for full traceability.

### Known deferred items at close: 4

Phases 02–04 VERIFICATION.md files have `human_needed` status — all verified in-browser during execution checkpoints. See STATE.md Deferred Items.

### Archive

- [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) — full phase details, cross-cutting constraints, key decisions
- [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) — all requirements with delivery notes and traceability

---
