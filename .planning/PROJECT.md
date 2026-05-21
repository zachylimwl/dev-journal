# Dev Journal

## What This Is

A personal web app built in Next.js for writing daily developer journal entries. You write free-form Markdown entries, tag them by project, and search or filter past entries to find what you worked on and learned. Single-user, no login, runs locally.

## Core Value

A fast place to write and later find anything you've worked on — entries should be writable in seconds and searchable in seconds.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can create, edit, and delete journal entries
- [ ] Entries support free-form Markdown with metadata (tags, date)
- [ ] Entries can be tagged with one or more project tags
- [ ] Entries render as formatted Markdown (not raw text)
- [ ] User can full-text search across all entries
- [ ] User can filter entries by tag/project
- [ ] User can combine text search and tag filter

### Out of Scope

- Authentication / login — single-user local app, no auth needed
- Multi-user support — personal tool only
- Cloud deployment — runs on localhost only for v1
- Entry timeline / calendar view — deferred to v2
- Export to Markdown files — deferred to v2
- Stats / streaks / analytics — deferred to v2

## Context

- Built as a personal developer tool for daily use
- Next.js app with local SQLite storage (no external DB dependencies)
- No deployment target for v1 — runs on developer's machine via `npm run dev`
- Markdown rendering needed for comfortable writing experience

## Constraints

- **Tech Stack**: Next.js + SQLite — keep it local and dependency-light
- **Deployment**: localhost only for v1 — no server/cloud requirements
- **Auth**: None — single user, private machine

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite for storage | Local-only app, no external DB deps, simple file-based persistence | — Pending |
| No authentication | Single-user personal tool on localhost | — Pending |
| Next.js | User's chosen framework | — Pending |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-21 after initialization*
