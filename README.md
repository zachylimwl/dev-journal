# Dev Journal

A personal developer journal built to explore software development with [GSD](https://github.com/dexaai/gsd) — a structured, plan-driven development workflow powered by Claude Code.

This project was built from scratch in 6 days (2026-05-21 to 2026-05-27) across 4 phases and 11 plans, delivering 12/12 v1 requirements with 102 commits.

## What it does

Write free-form Markdown journal entries, tag them by project, and search or filter past entries to find what you worked on and learned. Single-user, no login, runs locally.

**Core value:** A fast place to write and later find anything you've worked on — entries writable in seconds and searchable in seconds.

## Stack

- **Framework:** Next.js 16.2.6 (App Router, TypeScript)
- **Database:** SQLite via `better-sqlite3` + Drizzle ORM + FTS5 full-text search
- **Editor:** `@uiw/react-md-editor` with split-pane preview
- **Rendering:** `react-markdown` + `remark-gfm` + `rehype-highlight`
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Tests:** Vitest (33 tests)

## Getting started

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the database is created automatically on first run.

```bash
npm run build    # production build
npm run test     # run Vitest test suite
```

## Features (v1.0)

- **Write** — create and edit entries in a split-pane Markdown editor with autosave (no Save button)
- **Tag** — add project tags to entries; tags are normalized (trimmed, lowercased, deduplicated)
- **Read** — browse all entries newest-first with preview snippets; open any entry for full Markdown rendering with syntax highlighting
- **Delete** — delete entries with a confirmation dialog
- **Search** — full-text search powered by SQLite FTS5 with BM25 ranking; results update as you type (debounced)
- **Filter** — click any tag chip to filter by project; combine with keyword search to narrow further

## Project structure

```
src/
  app/                   # Next.js App Router pages
    page.tsx             # Home — entry list + search
    entries/[id]/        # Entry detail + edit pages
    new/                 # New entry page
  components/            # React components
  lib/
    actions.ts           # Server Actions (CRUD + search)
    db/                  # Drizzle schema + singleton
    utils/               # format utilities
tests/                   # Vitest test suite
.planning/               # GSD planning artifacts
  phases/                # Phase plans, summaries, and verification
  milestones/            # Archived milestone artifacts
```

## How it was built

This project was developed using [GSD](https://github.com/dexaai/gsd) — a structured development workflow that enforces planning before coding. Each feature phase followed: research → UI design contract → planning → execution → verification.

See `.planning/MILESTONES.md` for the full development history.
