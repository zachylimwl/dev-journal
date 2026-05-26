# Phase 4: Search & Filter - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 4-search-filter
**Areas discussed:** Search state model, Search bar placement, Tag filter UX

---

## Search State Model

**Q1: How should search state be managed?**

| Option | Description | Selected |
|--------|-------------|----------|
| Client wrapper on home page | SearchableList 'use client' component holds state, calls Server Action, no URL changes | |
| URL search params | Home stays Server Component; debounced router.push updates ?q=...; back/forward works, bookmarkable | ✓ |

**User's choice:** URL search params

---

**Q2: URL shape?**

| Option | Description | Selected |
|--------|-------------|----------|
| ?q=keyword&tag=project-name | Clean, readable. Combined: /?q=react&tag=frontend | ✓ |
| ?search=keyword&filter=tag-name | More verbose, slightly longer URLs | |

**User's choice:** ?q= and ?tag= params

---

**Q3: Empty state fallback — single action or branch?**

| Option | Description | Selected |
|--------|-------------|----------|
| Single searchEntries() for all cases | Returns all entries when both params empty; one action, one code path | ✓ |
| getEntries() for empty, searchEntries() when params present | Keeps proven getEntries() for no-filter path | |

**User's choice:** Single searchEntries() handles all cases

---

**Q4: Client component boundary?**

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone SearchInput client component | Small 'use client' component with useRouter + debounce; home page stays Server Component | ✓ |
| Wrap entire home page in client component | Full list client-side; simpler mental model but loses server-rendered list | |

**User's choice:** Standalone SearchInput client component

---

## Search Bar Placement

**Q1: Where does the search input live?**

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on home page only | Above entry list; AppHeader unchanged; other pages unaffected | ✓ |
| In AppHeader — center slot | 3-column header layout; available on every page | |
| In AppHeader — replaces right slot | Search in right slot, New Entry moved elsewhere | |

**User's choice:** Inline on home page only

---

**Q2: Show result count when filtered?**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — show 'N entries' when filtered | Count label below search bar when q or tag is set | ✓ |
| No — results speak for themselves | Just show filtered list; empty state message is enough | |

**User's choice:** Yes, show result count when filtered

---

**Q3: Empty-state message copy?**

| Option | Description | Selected |
|--------|-------------|----------|
| You decide | Claude picks sensible copy for keyword and tag empty states | ✓ |
| I'll specify | User provides exact copy | |

**User's choice:** Claude's discretion

---

## Tag Filter UX

**Q1: How does clicking a tag activate the filter?**

| Option | Description | Selected |
|--------|-------------|----------|
| Click tag chip → sets ?tag= in URL | TagChip gets 'use client' + router.push; works from any page | ✓ |
| Dedicated tag list panel / sidebar | New UI element; more discoverable for many tags | |

**User's choice:** Click tag chip anywhere navigates to /?tag=

---

**Q2: How does the user see and clear the active tag filter?**

| Option | Description | Selected |
|--------|-------------|----------|
| Active tag shown as dismissible chip above the list | "Active filter: frontend ×" chip; clicking × clears param | ✓ |
| Active tag chip visually highlighted in entry cards | Matching chip changes color; click again to deactivate | |

**User's choice:** Dismissible active filter chip above the list

---

**Q3: Should tag chip navigation apply on all pages or home only?**

| Option | Description | Selected |
|--------|-------------|----------|
| All pages | EntryCard + detail page TagChips all navigate; consistent "find more like this" behavior | ✓ |
| Home list only | Detail page chips stay non-interactive | |

**User's choice:** All pages

---

## Claude's Discretion

- Debounce delay for SearchInput (suggested: 300ms)
- Exact empty-state copy for no-results (keyword and tag variants)
- Whether SearchInput and active filter chip are one component or two
- FTS5 special character handling / sanitization
- Visual styling of active filter chip

## Deferred Ideas

- Search result snippet highlighting (V2-SRCH-01) — not in Phase 4
- Tag autocomplete (V2-SRCH-02) — not in Phase 4
- Entry count per tag in tag list (V2-VIEW-02) — not in Phase 4
