---
phase: 02-read-loop
plan: "02"
subsystem: ui
tags: [react, next.js, react-markdown, remark-gfm, rehype-highlight, tailwindcss, tailwindcss-typography, server-components]

# Dependency graph
requires:
  - phase: 02-01
    provides: getEntries, getEntryById, EntryListItem, EntryDetail types, highlight.js github-dark CSS in globals.css
provides:
  - AppHeader component (persistent header with Dev Journal wordmark and right-side slot)
  - TagChip component (inline tag pill, non-interactive)
  - MarkdownBody component (react-markdown wrapper with remark-gfm + rehype-highlight)
  - EntryCard component (entry list row with title, date, snippet, tags)
  - Home page (/) listing all entries newest-first with empty state
  - Entry detail page (/entries/[id]) with full Markdown rendering and 404 handling
affects: [03-write-loop, 04-tag-filter, future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All page and component files are Server Components (no 'use client')"
    - "prose-pre:p-0 prose-pre:bg-transparent on MarkdownBody article prevents @tailwindcss/typography from overriding highlight.js github-dark background"
    - "params in Next.js 16 dynamic routes must be awaited (Promise<{ id: string }>)"
    - "Number() coercion of URL param gives NaN for non-numeric IDs; Drizzle returns null; notFound() fires — path traversal safe"
    - "Right-side slot div in AppHeader left empty for Phase 3 New Entry button"
    - "divide-y divide-zinc-200 on entry list wrapper provides divider rows without borders on EntryCard itself"
    - "Back link uses <Link href='/'>  not router.back() for direct-URL-safe navigation"

key-files:
  created:
    - src/components/app-header.tsx
    - src/components/tag-chip.tsx
    - src/components/markdown-body.tsx
    - src/components/entry-card.tsx
    - src/app/entries/[id]/page.tsx
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx

key-decisions:
  - "prose-pre:p-0 prose-pre:bg-transparent is mandatory on MarkdownBody to prevent @tailwindcss/typography overriding highlight.js github-dark #0d1117 background"
  - "Back link uses <Link href='/'> not router.back() so direct URL navigation still has a working back path"
  - "AppHeader right-side slot is an empty <div /> reserved for Phase 3 New Entry button — not removed"
  - "EntryCard has no border — divide-y on the list wrapper provides dividers (D-04 pattern)"
  - "react-markdown is RSC-safe and imported directly — no dynamic() needed (unlike @uiw/react-md-editor)"

patterns-established:
  - "Server Component default: all new components and pages are Server Components unless browser APIs/hooks required"
  - "react-markdown + remark-gfm + rehype-highlight stack for Markdown rendering"
  - "Next.js 16 async params pattern: type Props = { params: Promise<{ id: string }> }; const { id } = await params"
  - "Number() + notFound() pattern for safe numeric route param handling"

requirements-completed: [VIEW-01, VIEW-02, VIEW-03]

# Metrics
duration: 45min
completed: 2026-05-25
---

# Phase 2 Plan 02: Read Loop UI Summary

**Four Server Components (AppHeader, TagChip, MarkdownBody, EntryCard) wired into home page and detail page delivering a complete read loop with GitHub Dark syntax highlighting and safe 404 handling**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-05-25T10:33:00Z
- **Completed:** 2026-05-25T11:01:00Z
- **Tasks:** 2 auto tasks + 1 human-verify checkpoint (approved)
- **Files modified:** 7

## Accomplishments

- Built 4 new Server Components with zero 'use client' directives
- Home page renders entry list newest-first with title, relative date, snippet, and tag chips; shows empty state when no entries exist
- Detail page renders full Markdown (headings, lists, bold/italic, links, code blocks) with GitHub Dark syntax highlighting at #0d1117 with no style bleed from @tailwindcss/typography
- Non-numeric and missing entry IDs return Next.js 404 via Number() coercion + notFound() — no crash, path traversal safe
- All 7 human verification checks passed: header, entry list, detail page Markdown rendering, syntax highlighting, 404 on /entries/abc, 404 on /entries/999999, back link navigation

## Task Commits

Each task was committed atomically:

1. **Tasks 1 + 2: Build UI components and pages for read loop** - `a51e0b4` (feat)

**Plan metadata:** (this commit — docs)

## Files Created/Modified

- `src/components/app-header.tsx` - Persistent header with Dev Journal wordmark and empty right-side slot for Phase 3
- `src/components/tag-chip.tsx` - Inline tag pill (non-interactive in Phase 2)
- `src/components/markdown-body.tsx` - react-markdown wrapper with remark-gfm + rehype-highlight + prose class; prose-pre overrides prevent typography plugin from clobbering code block background
- `src/components/entry-card.tsx` - Entry list row: title, date, snippet, tag chips wrapped in Link
- `src/app/entries/[id]/page.tsx` - Entry detail page: async params, getEntryById, notFound(), MarkdownBody, back link
- `src/app/layout.tsx` - Added AppHeader above {children}; updated metadata.title to "Dev Journal"
- `src/app/page.tsx` - Home page: getEntries(), EntryCard list with divide-y dividers, empty state

## Decisions Made

- **prose-pre:p-0 prose-pre:bg-transparent:** Mandatory Tailwind class overrides on MarkdownBody's article element. Without them, @tailwindcss/typography applies padding and a background to `<pre>` tags that overrides highlight.js github-dark #0d1117 background, producing a mismatched background strip around code blocks.
- **Back link as `<Link href="/">`:** Using router.back() would fail on direct URL navigation (no history entry). Static href ensures the back link always works.
- **Right-side slot in AppHeader:** Left as empty `<div />` per D-10 decision — Phase 3 will slot the New Entry button here. Removing it would require re-adding the flex structure later.
- **No dynamic() for react-markdown:** Unlike @uiw/react-md-editor, react-markdown is synchronous and uses no browser APIs. It is RSC-safe and can be imported directly in Server Components.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Complete read loop is live: browse entries on /, read full entries at /entries/[id]
- AppHeader right-side slot ready for Phase 3 New Entry button
- TagChip is non-interactive; Phase 4 will add filter-by-tag behavior
- All three read-loop requirements (VIEW-01, VIEW-02, VIEW-03) verified by human checkpoint

## Self-Check: PASSED

- `src/components/app-header.tsx` — exists (committed in a51e0b4)
- `src/components/tag-chip.tsx` — exists (committed in a51e0b4)
- `src/components/markdown-body.tsx` — exists (committed in a51e0b4)
- `src/components/entry-card.tsx` — exists (committed in a51e0b4)
- `src/app/entries/[id]/page.tsx` — exists (committed in a51e0b4)
- `src/app/layout.tsx` — modified (committed in a51e0b4)
- `src/app/page.tsx` — modified (committed in a51e0b4)
- Commit a51e0b4 verified in git log

---
*Phase: 02-read-loop*
*Completed: 2026-05-25*
