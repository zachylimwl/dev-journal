---
phase: 04-search-filter
plan: 02
subsystem: ui
tags: [react, nextjs, tailwind, lucide-react, use-client, useRouter, useSearchParams, url-state]

# Dependency graph
requires:
  - phase: 04-01
    provides: FTS5 search action and database schema for search feature
provides:
  - SearchInput client component with 300ms debounce and ?tag= preservation
  - ActiveFilterChip client component for clearing active tag filters
  - TagChip upgraded from non-interactive span to navigating button
affects:
  - 04-03 (page wiring that imports all three components)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "'use client' component with useRouter + useSearchParams for URL-driven state"
    - "Debounced input using useRef<ReturnType<typeof setTimeout> | null> + useCallback"
    - "URLSearchParams preservation pattern for multi-param URLs"
    - "Uncontrolled input with defaultValue for SSR hydration compatibility"

key-files:
  created:
    - src/components/search-input.tsx
    - src/components/active-filter-chip.tsx
  modified:
    - src/components/tag-chip.tsx

key-decisions:
  - "router.replace (not push) for SearchInput — intermediate typing states should not pollute browser history"
  - "router.push (not replace) for ActiveFilterChip clear — clearing a filter IS a new navigation state worth preserving"
  - "Uncontrolled input (defaultValue) — controlled input fights async debounce and causes cursor position bugs"
  - "font-normal for TagChip per UI-SPEC (was font-medium in Phase 3)"

patterns-established:
  - "Pattern: 'use client' + useRouter + useSearchParams for URL navigation in client components"
  - "Pattern: URLSearchParams(searchParams.toString()) to read + modify current params without losing others"
  - "Pattern: useRef timer for debounce without useState to avoid re-renders during typing"

requirements-completed:
  - SRCH-01
  - SRCH-02

# Metrics
duration: 1min
completed: 2026-05-27
---

# Phase 04 Plan 02: Search & Filter Components Summary

**Three 'use client' URL-navigation components: debounced SearchInput with tag preservation, ActiveFilterChip with q preservation, and TagChip upgraded from span to navigating button**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-27T07:13:19Z
- **Completed:** 2026-05-27T07:14:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- SearchInput component with 300ms debounce using useRef, router.replace, preserves existing ?tag= param via URLSearchParams
- ActiveFilterChip component that clears ?tag= while preserving ?q= via router.push
- TagChip replaced entirely: non-interactive span -> navigating button with encodeURIComponent, font-medium -> font-normal

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SearchInput client component** - `51aa4d8` (feat)
2. **Task 2: Create ActiveFilterChip and upgrade TagChip** - `c36db97` (feat)

## Files Created/Modified
- `src/components/search-input.tsx` - New: debounced search input, useSearchParams for param preservation, router.replace
- `src/components/active-filter-chip.tsx` - New: tag filter dismiss chip, router.push preserving q param
- `src/components/tag-chip.tsx` - Modified: span -> button, added 'use client' + useRouter + encodeURIComponent, hover states, font-normal

## Decisions Made
- router.replace for SearchInput (not push): typing intermediate states do not belong in browser history; the final debounced URL is addressable
- router.push for ActiveFilterChip clear: clearing a filter is a deliberate user navigation action, should be in history
- Uncontrolled input with defaultValue: controlled input (value prop + useState) fights the debounce pattern and causes cursor-jump bugs during typing
- font-normal on TagChip: required by UI-SPEC (was font-medium in original Phase 3 implementation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three components are ready for Plan 03 to import and wire into src/app/page.tsx
- SearchInput requires a Suspense wrapper when used in page.tsx (useSearchParams constraint)
- No blockers

---
*Phase: 04-search-filter*
*Completed: 2026-05-27*
