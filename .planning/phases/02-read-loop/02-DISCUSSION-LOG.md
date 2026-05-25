# Phase 2: Read Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 2-Read Loop
**Areas discussed:** Entry card layout, Syntax highlighting theme, Reading layout width, App header / chrome

---

## Entry Card Layout

### Q1: What information should each entry card show?

| Option | Description | Selected |
|--------|-------------|----------|
| Title + date + snippet | Clean, no DB join needed. Tags show only on detail page. | |
| Title + date + snippet + tags | Tags visible on list as small badges. Requires JOIN with entry_tags. | ✓ |
| Date + snippet only (no title) | Diary-style — date is primary identifier. | |

**User's choice:** Title + date + snippet + tags
**Notes:** Tags on the list view are important — user expects to scan by project at a glance.

### Q2: How long should the preview snippet be?

| Option | Description | Selected |
|--------|-------------|----------|
| ~150 characters (2 lines) | Standard list preview length. | |
| ~80 characters (1 line) | Very compact. | |
| ~300 characters (3-4 lines) | More context per entry. Better for dense technical notes. | ✓ |

**User's choice:** ~300 characters (3-4 lines)
**Notes:** Entries are technical notes — more preview context helps identify the right entry.

### Q3: How should the entry date be displayed?

| Option | Description | Selected |
|--------|-------------|----------|
| Relative + absolute (e.g. "2 days ago — May 23, 2026") | Quick orientation and precise timestamp. | ✓ |
| Absolute only (e.g. "May 23, 2026") | Always precise, simpler server-side. | |
| Relative only (e.g. "yesterday") | Gets confusing for entries older than ~2 weeks. | |

**User's choice:** Relative + absolute
**Notes:** Recommended option selected. Compute both server-side at request time.

### Q4: What visual style for each entry card?

| Option | Description | Selected |
|--------|-------------|----------|
| Bordered card with subtle shadow | Clear item separation, hover state. | |
| Divider-separated rows (no card box) | Horizontal rule between entries. Log/changelog feel. | ✓ |
| You decide | Claude picks the styling. | |

**User's choice:** Divider-separated rows
**Notes:** Developer log aesthetic — like a changelog or terminal output rather than a social feed.

---

## Syntax Highlighting Theme

### Q1: Which highlight.js theme for code blocks?

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Dark | Dark background on light page. High contrast, familiar. | ✓ |
| GitHub Light | Matches light app uniformly. Lower contrast between code and prose. | |
| Atom One Dark | Rich colors, slightly more saturated. | |

**User's choice:** GitHub Dark
**Notes:** Recommended option selected. Dark code blocks visually stand out from prose content.

### Q2: Fixed theme or adaptive to OS preference?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed GitHub Dark always | Deliberate design choice. One CSS import, no media queries. | ✓ |
| Auto (dark/light per OS preference) | Requires conditional CSS or media-query overrides. More complexity. | |

**User's choice:** Fixed GitHub Dark always
**Notes:** Simpler implementation, intentional look.

---

## Reading Layout Width

### Q1: How wide should the entry detail view be?

| Option | Description | Selected |
|--------|-------------|----------|
| Constrained prose column (~70ch / max-w-3xl) | Classic reading width. | |
| Full page width | Stretches to fill browser window. | |
| Medium constrained (~90ch / max-w-5xl) | Wider — better for code blocks that would otherwise wrap. | ✓ |

**User's choice:** Medium constrained (max-w-5xl)
**Notes:** Code-heavy entries benefit from the wider column.

### Q2: Should home page use the same width as detail page?

| Option | Description | Selected |
|--------|-------------|----------|
| Same constraint — both max-w-5xl | Consistent layout, no shift between list and detail. | ✓ |
| List wider (max-w-6xl), detail max-w-5xl | Dashboard feel for list, focused for detail. | |
| You decide | Claude picks. | |

**User's choice:** Same constraint — both max-w-5xl
**Notes:** Layout consistency preferred. No reflow when navigating between list and detail.

---

## App Header / Chrome

### Q1: Should Phase 2 set up a persistent app header?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal header — 'Dev Journal' title only | Sets layout shell; Phase 3 slots 'New Entry' button into it. | ✓ |
| No header — content starts at top | Phase 3 will need to restructure layout when adding the button. | |
| Full nav bar with placeholder links | More scaffolding than Phase 2 needs. | |

**User's choice:** Minimal header — 'Dev Journal' title only
**Notes:** Recommended option selected. Proactively sets up the layout shell for Phase 3.

### Q2: Where should the header title live?

| Option | Description | Selected |
|--------|-------------|----------|
| In layout.tsx — persistent across all pages | Clean separation; every page inherits it. | ✓ |
| On each page separately | More flexible but duplicates header markup. | |

**User's choice:** In layout.tsx
**Notes:** Recommended option selected. Standard Next.js App Router pattern.

### Q3: Should entry detail page show a back link?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — '← All entries' link above entry | Essential navigation. Anchors the read loop. | ✓ |
| No — rely on browser back | Simpler markup. | |
| You decide | Claude decides. | |

**User's choice:** Yes — '← All entries' link
**Notes:** `<Link href="/">` (not `router.back()`) for reliability — works on first load too.

---

## Claude's Discretion

- Exact Tailwind classes for the header (font size, padding, border-bottom)
- Snippet Markdown stripping before truncating (plain text snippets)
- Snippet ellipsis: truncate at word boundary, append `…`
- Relative date computed server-side (no client JS, no hydration mismatch)
- `@tailwindcss/typography` prose plugin + override for code block style bleeding

## Deferred Ideas

None — discussion stayed within phase scope.
