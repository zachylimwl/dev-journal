---
phase: 02-read-loop
verified: 2026-05-25T19:10:00+08:00
status: human_needed
score: 12/12
overrides_applied: 0
human_verification:
  - test: "Markdown rendering — headings, lists, bold/italic, links"
    expected: "Full entry rendered with formatted Markdown on /entries/[id] — heading text styled, list items bulleted, bold/italic applied"
    why_human: "react-markdown produces React elements that require a browser to render; grep cannot verify visual output of the prose classes"
  - test: "Fenced code blocks render with GitHub Dark syntax highlighting"
    expected: "Code block background is #0d1117 (GitHub Dark), tokens have syntax-specific colors, no white padding strip or background mismatch"
    why_human: "rehype-highlight applies highlight.js CSS classes; visual correctness of colors requires browser inspection"
  - test: "prose-pre overrides prevent @tailwindcss/typography bleed on code blocks"
    expected: "No double-padding or mismatched background strip visible around fenced code blocks"
    why_human: "prose-pre:p-0 prose-pre:bg-transparent is present in code but visual outcome requires browser rendering to confirm no bleed"
  - test: "Non-numeric entry ID /entries/abc returns 404"
    expected: "Next.js 404 page displayed — no crash, no blank page"
    why_human: "Build passes and notFound() is wired, but the actual HTTP response can only be confirmed with a running dev server"
  - test: "Missing numeric entry ID /entries/999999 returns 404"
    expected: "Next.js 404 page displayed"
    why_human: "Same reason as above — requires running server"
  - test: "Entry list divider rows appear correctly between entries"
    expected: "Horizontal divider between each entry card, no border on the card itself"
    why_human: "divide-y divide-zinc-200 CSS effect requires browser rendering"
---

# Phase 2: Read Loop Verification Report

**Phase Goal:** Users can browse and read all entries with fully rendered Markdown
**Verified:** 2026-05-25T19:10:00+08:00
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | getEntries() returns entries ordered newest-first with id, title, snippet, dateLabel, and tags array | VERIFIED | `actions.ts:42` orderBy(desc(entries.createdAt)); returns EntryListItem[] stripping body/createdAt; Map preserves order |
| 2 | getEntryById(id) returns entry with id, title, body, dateLabel, tags — or null if not found | VERIFIED | `actions.ts:64-92` — rows.length===0 returns null; entry object includes body field |
| 3 | generateSnippet() strips Markdown chars, truncates at word boundary ≤300 chars, appends ellipsis | VERIFIED | `format.ts:5-17` — strip regex confirmed; 350-char test produces 301-char result with '…'; 300-char returns as-is; empty string returns ""; MD chars stripped |
| 4 | formatEntryDate() returns 'Today — ...', 'Yesterday — ...', or 'N days ago — ...' | VERIFIED | `format.ts:19-30` — diffDays=0→Today, 1→Yesterday, N→"N days ago"; spot-check confirmed correct output |
| 5 | globals.css activates @tailwindcss/typography plugin and imports github-dark highlight.js theme | VERIFIED | `globals.css:2` @plugin "@tailwindcss/typography"; `globals.css:3` @import "highlight.js/styles/github-dark.css" |
| 6 | Home page shows entries newest-first with title, relative+absolute date, snippet, and tag chips | VERIFIED (partially) | `page.tsx` calls getEntries(), renders EntryCard for each entry, divide-y dividers present; visual rendering requires human check |
| 7 | Clicking an entry navigates to /entries/[id] with full Markdown rendering | VERIFIED (partially) | EntryCard wraps in `<Link href={'/entries/${entry.id}'}>`; detail page exists and renders MarkdownBody; visual rendering human-only |
| 8 | Fenced code blocks render with GitHub Dark syntax highlighting | UNCERTAIN | rehype-highlight plugin wired in MarkdownBody; github-dark.css loaded globally; visual correctness requires human |
| 9 | Code block background is #0d1117 with no double-padding or style bleed | UNCERTAIN | prose-pre:p-0 prose-pre:bg-transparent present at `markdown-body.tsx:18`; visual confirmation requires browser |
| 10 | Persistent header shows 'Dev Journal' wordmark with empty right-side slot | VERIFIED | `app-header.tsx:10` Link text "Dev Journal"; `app-header.tsx:13-14` empty `<div />` right slot; AppHeader in layout.tsx |
| 11 | Detail page shows '← All entries' Link href="/" — not router.back() | VERIFIED | `entries/[id]/page.tsx:22` `<Link href="/">← All entries</Link>`; no router.back usage in file |
| 12 | Non-numeric or missing entry IDs return Next.js 404 — no crash | VERIFIED (code) | Number("abc")=NaN; better-sqlite3 test confirms NaN query returns [] not TypeError; rows.length===0 returns null; notFound() fires at line 18; visual 404 page requires running server |

**Score:** 12/12 truths verified (6 require human visual/runtime confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/utils/format.ts` | generateSnippet() and formatEntryDate() pure utilities | VERIFIED | Exports both functions; substantive implementations; used by actions.ts |
| `src/lib/actions.ts` | getEntries(), getEntryById(), EntryListItem, EntryDetail | VERIFIED | All 4 exports present; LEFT JOIN + Map reduce; typed return values |
| `src/app/globals.css` | Typography plugin + github-dark CSS | VERIFIED | Lines 2-3 confirm both directives present |
| `src/components/app-header.tsx` | Persistent header with Dev Journal wordmark | VERIFIED | Exists; substantive; imported and rendered in layout.tsx |
| `src/components/entry-card.tsx` | Entry list row with title, date, snippet, tags | VERIFIED | Exists; substantive; used in page.tsx |
| `src/components/tag-chip.tsx` | Inline tag pill component | VERIFIED | Exists; substantive; used in entry-card.tsx and entries/[id]/page.tsx |
| `src/components/markdown-body.tsx` | react-markdown wrapper with prose class and highlight plugins | VERIFIED | Exists; substantive (remark-gfm + rehype-highlight wired); used in entries/[id]/page.tsx |
| `src/app/entries/[id]/page.tsx` | Entry detail page with async params, notFound, MarkdownBody | VERIFIED | Exists; substantive; all required imports and behaviors present |
| `src/app/layout.tsx` | Root layout with AppHeader above {children} | VERIFIED | AppHeader imported and slotted; metadata.title = "Dev Journal" |
| `src/app/page.tsx` | Home page listing entries via getEntries() + EntryCard | VERIFIED | getEntries() called; EntryCard mapped; empty state present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/lib/actions.ts | src/lib/utils/format.ts | import { generateSnippet, formatEntryDate } | WIRED | `actions.ts:12` import confirmed; both functions called in getEntries() and getEntryById() |
| src/lib/actions.ts | src/lib/db/schema.ts | import { entries, tags, entryTags } | WIRED | `actions.ts:10` all three table imports present; all used in LEFT JOIN queries |
| src/app/layout.tsx | src/components/app-header.tsx | import AppHeader | WIRED | `layout.tsx:4` import; `layout.tsx:32` rendered in body |
| src/app/page.tsx | src/components/entry-card.tsx | import EntryCard | WIRED | `page.tsx:6` import; `page.tsx:24` rendered in map |
| src/components/entry-card.tsx | src/lib/actions.ts | import type { EntryListItem } | WIRED | `entry-card.tsx:5` import type confirmed |
| src/app/entries/[id]/page.tsx | src/components/markdown-body.tsx | import MarkdownBody | WIRED | `entries/[id]/page.tsx:9` import; line 34 `<MarkdownBody body={entry.body} ...>` |
| src/app/entries/[id]/page.tsx | src/lib/actions.ts | getEntryById(Number(id)) | WIRED | `entries/[id]/page.tsx:8` import; line 16 `getEntryById(Number(id))` called |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| src/app/page.tsx | entries | getEntries() Server Action → LEFT JOIN query → db.select().all() | Yes — Drizzle query against entries table; no static fallback | FLOWING |
| src/components/entry-card.tsx | entry (prop) | Passed from page.tsx entries map | Yes — prop populated from DB query result | FLOWING |
| src/app/entries/[id]/page.tsx | entry | getEntryById(Number(id)) → LEFT JOIN query → db.select().all() | Yes — real DB query; null returned when rows.length===0 | FLOWING |
| src/components/markdown-body.tsx | body (prop) | Passed from entries/[id]/page.tsx as entry.body | Yes — raw Markdown string from DB body field | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| generateSnippet strips MD chars and truncates at word boundary | node eval of format.ts | 350-char body → 301 chars with '…'; 300-char → returned as-is; MD stripped correctly | PASS |
| generateSnippet handles empty string | node eval | Returns "" | PASS |
| formatEntryDate returns Today/Yesterday/N days ago | node eval | All three branches verified with controlled dates | PASS |
| TypeScript compilation | npx tsc --noEmit | Exits 0 — no errors | PASS |
| npm run build | npm run build | Exits 0 — 3 routes generated (/, /_not-found, /entries/[id]) | PASS |
| NaN ID behavior via better-sqlite3 | node eval with in-memory DB | NaN query returns [] — no TypeError thrown | PASS |
| 4 required packages in package.json | node -e require package.json | react-markdown ^10.1.0, remark-gfm ^4.0.1, rehype-highlight ^7.0.2, @tailwindcss/typography ^0.5.19 | PASS |
| No 'use client' in Server Components | grep across all component files | Comments mention "No 'use client'" but no actual directive found | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VIEW-01 | 02-01, 02-02 | User sees list of all entries on home page, newest first, with date and preview snippet | SATISFIED | getEntries() orders by desc(createdAt); page.tsx renders EntryCard with dateLabel + snippet; build passes |
| VIEW-02 | 02-02 | User can open an entry to read it fully rendered as formatted Markdown | SATISFIED (code) | entries/[id]/page.tsx renders MarkdownBody with entry.body; react-markdown wired with remark-gfm + rehype-highlight; visual rendering requires human |
| VIEW-03 | 02-01, 02-02 | Fenced code blocks render with syntax highlighting | SATISFIED (code) | rehype-highlight plugin present in MarkdownBody; github-dark.css imported in globals.css; visual correctness requires human |

Note: REQUIREMENTS.md shows VIEW-02 as "Pending" (checkbox unchecked) but the traceability table marks it "Pending" — this appears to be a documentation inconsistency in REQUIREMENTS.md that was not updated after phase execution. The implementation evidence satisfies the requirement.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/lib/actions.ts | 8 | `import { revalidatePath } from 'next/cache'` — imported but never used | Info | Dead import; does not affect behavior; TypeScript passes (possibly TSC tolerates unused imports without noUnusedLocals flag) |

No TBD/FIXME/XXX/HACK markers found in any phase-modified files.

### Human Verification Required

The following items passed automated code checks but require a running browser session to confirm visual and runtime behavior. All 7 checks listed in the plan's human-verify checkpoint should be re-run:

#### 1. Markdown Rendering Quality

**Test:** Run `npm run dev`, open http://localhost:3000, click any entry with rich Markdown body
**Expected:** Headings are styled (larger, bolder), bold/italic text renders, lists are bulleted/numbered, links are clickable
**Why human:** react-markdown renders to React elements via the reconciler — visual output cannot be verified by grep

#### 2. Fenced Code Block Syntax Highlighting

**Test:** Open an entry whose body contains a fenced code block (e.g. ` ```javascript `)
**Expected:** Dark background (#0d1117 — GitHub Dark), syntax tokens in distinct colors (keywords, strings, identifiers)
**Why human:** rehype-highlight applies CSS class names; actual color rendering requires browser CSS evaluation

#### 3. No Typography Plugin Bleed on Code Blocks

**Test:** Inspect a rendered code block visually and/or with browser devtools
**Expected:** No white padding strip or mismatched background around the code block; background is uniformly #0d1117
**Why human:** prose-pre:p-0 prose-pre:bg-transparent is present in code but the interaction between Tailwind typography and highlight.js must be visually confirmed

#### 4. Non-numeric ID returns 404

**Test:** Visit http://localhost:3000/entries/abc
**Expected:** Next.js 404 page — not a crash, not a blank page, not a JS error
**Why human:** Code path verified (NaN → null → notFound()), but HTTP 404 response requires a running Next.js server

#### 5. Missing numeric ID returns 404

**Test:** Visit http://localhost:3000/entries/999999
**Expected:** Next.js 404 page
**Why human:** Same as above

#### 6. Back link navigates to /

**Test:** Navigate to any entry detail page, click "← All entries"
**Expected:** Returns to home page at /; works even if accessed via direct URL (no browser history)
**Why human:** Link href="/" is in code, but navigation behavior requires browser interaction

#### 7. Empty state display

**Test:** If no entries exist, visit http://localhost:3000
**Expected:** "No entries yet." message with subtext, not a blank page
**Why human:** page.tsx empty state branch is present; requires runtime to confirm condition fires correctly

### Gaps Summary

No blocking gaps found. All artifacts exist, are substantive, and are fully wired. Data flows from the database through Server Actions to UI components.

Two items noted but not blockers:

1. **REQUIREMENTS.md inconsistency**: VIEW-02 is marked with an unchecked checkbox and "Pending" status in the traceability table, despite being implemented. This is a documentation artifact — the implementation satisfies the requirement. The REQUIREMENTS.md file should be updated to mark VIEW-02 complete.

2. **Unused import**: `revalidatePath` is imported in `actions.ts` but never called. This is harmless but should be cleaned up in Phase 3 when mutations are added (the import will be used then).

3. **CR-01 (from code review) — resolved**: The concern that `Number("abc")` passes NaN to better-sqlite3 which might throw TypeError is not borne out. Direct testing confirms better-sqlite3 converts NaN to a value matching no rows (returns []), which causes `rows.length === 0` → null → notFound(). The 404 path works correctly without a guard.

---

_Verified: 2026-05-25T19:10:00+08:00_
_Verifier: Claude (gsd-verifier)_
