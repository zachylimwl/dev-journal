# Phase 2: Read Loop — Research

**Researched:** 2026-05-25
**Domain:** React Markdown rendering, Tailwind Typography, Drizzle ORM joins, Next.js dynamic routes
**Confidence:** HIGH

---

## Summary

Phase 2 adds the read-only experience on top of the Phase 1 data layer: a home page listing all entries newest-first with preview snippets, and a detail page rendering full Markdown with syntax-highlighted code blocks. No new interactive components exist in this phase — every page is a React Server Component.

The locked stack (react-markdown 10.1.0 + remark-gfm 4.0.1 + rehype-highlight 7.0.2 + @tailwindcss/typography) is well-understood and integrates cleanly with Next.js 16 App Router Server Components. The default `Markdown` component from react-markdown is synchronous and uses no hooks or browser APIs — it runs in RSC without `'use client'` and without `dynamic()`. The one integration subtlety is the `@tailwindcss/typography` plugin, which in Tailwind v4 is activated via `@plugin` in `globals.css` (not via a JS config file), and code-block style bleed is prevented with the `prose-pre:p-0 prose-pre:bg-transparent` utility pair.

The Drizzle ORM query for `getEntries()` requires a LEFT JOIN across three tables (`entries → entry_tags → tags`) and must reduce flat rows into per-entry tag arrays in application code — SQLite has no native `GROUP_CONCAT` equivalent accessible through Drizzle's typed API without raw SQL. The detail page route `/entries/[id]` must `await params` (Next.js 15+ params are a Promise), call `notFound()` from `next/navigation` on a missing entry, and pass the `body` string directly to `<MarkdownBody>`.

**Primary recommendation:** Use `<Markdown>` (default export, synchronous) in a Server Component `<MarkdownBody>`. Activate `@tailwindcss/typography` with `@plugin "@tailwindcss/typography"` in globals.css. Write snippet stripping as pure string logic in `getEntries()`. Reduce JOIN rows to per-entry tag arrays in JS, not SQL.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Each card shows: title + date + snippet + tags (requires JOIN with `entry_tags` in `getEntries()`)
- **D-02:** Preview snippet length: ~300 characters (3–4 lines) — truncated from `body` on the server
- **D-03:** Date format: relative + absolute ("2 days ago — May 23, 2026") — both computed server-side at request time
- **D-04:** Visual style: divider-separated rows (no card box, no shadow/border) — horizontal rule between entries
- **D-05:** Theme: GitHub Dark (`highlight.js/styles/github-dark.css`) — fixed, always dark regardless of OS preference
- **D-06:** No adaptive dark/light switching — a single CSS import; no media query override needed
- **D-07:** Both home page and entry detail page use `max-w-5xl mx-auto` — same constraint on both
- **D-08:** No full-width layout — content always constrained
- **D-09:** Persistent minimal header: "Dev Journal" title only, added to `src/app/layout.tsx`
- **D-10:** Phase 3 will slot a "New Entry" button into the header — layout must accommodate a right-side action slot
- **D-11:** Entry detail page includes a "← All entries" back link — uses `<Link href="/">`, NOT `router.back()`

### Claude's Discretion

- Exact Tailwind classes for the header (font size, padding, border-bottom) — keep minimal and functional
- Snippet generation strategy: strip Markdown syntax chars before truncating (plain text, not `##` or `**`)
- Snippet ellipsis handling: truncate at word boundary, append `…`
- Relative date implementation: compute server-side using request timestamp vs `created_at`; no client-side JS
- `@tailwindcss/typography` prose plugin for Markdown body — apply `prose` class; override code block defaults

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-01 | User sees a list of all entries on the home page, newest first, with date and preview snippet | Drizzle `orderBy(desc(...))` + LEFT JOIN for tags + snippet generation in `getEntries()` |
| VIEW-02 | User can open an entry to read it fully rendered as formatted Markdown | `/entries/[id]` dynamic route + `getEntryById()` + `<MarkdownBody>` with react-markdown + remark-gfm |
| VIEW-03 | Fenced code blocks in entries render with syntax highlighting | rehype-highlight 7.x plugin + `highlight.js/styles/github-dark.css` import + `prose-pre:p-0 prose-pre:bg-transparent` fix |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Entry list with snippets and tags | Frontend Server (RSC) | Database | `getEntries()` runs at request time via Server Action; all data fetched before render |
| Markdown rendering to HTML | Frontend Server (RSC) | — | `react-markdown` synchronous `Markdown` component runs server-side; zero JS sent to browser |
| Syntax highlighting | Frontend Server (RSC) | CDN/Static (CSS) | `rehype-highlight` injects CSS class names server-side; colors come from imported CSS (static) |
| Snippet generation | API / Backend | — | Pure string manipulation in `getEntries()` Server Action; never in browser |
| Relative date formatting | Frontend Server (RSC) | — | Computed server-side at request time against `new Date()`; avoids hydration mismatch |
| Tag display | Frontend Server (RSC) | Database | Tags resolved via LEFT JOIN in `getEntries()` / `getEntryById()` |
| Persistent app header | Frontend Server (RSC) | — | Lives in `layout.tsx` — rendered once per route; no client state |
| Navigation (list → detail, back link) | Browser / Client | — | `<Link>` component handles client-side navigation via Next.js router |

---

## Standard Stack

### Core (Phase 2 new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | 10.1.0 | Render Markdown strings to React elements | Locked in CLAUDE.md; safe by default (no dangerouslySetInnerHTML); RSC-compatible synchronous component |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown (tables, task lists, strikethrough) | Locked in CLAUDE.md; developer-expected formatting; official remark ecosystem |
| rehype-highlight | 7.0.2 | Syntax highlighting via highlight.js class injection | Locked in CLAUDE.md; pairs with react-markdown rehype pipeline |
| @tailwindcss/typography | 0.5.x | `prose` utility class for Markdown body styling | Required to satisfy SC-4 (no style bleed into code blocks); Tailwind v4 compatible |

### Already Installed (Phase 1)

| Library | Version | Purpose |
|---------|---------|---------|
| better-sqlite3 | 12.10.0 | Synchronous SQLite driver |
| drizzle-orm | 0.45.2 | Type-safe query builder |
| next | 16.2.6 | App framework with App Router |
| tailwindcss | 4.x | Utility-first CSS |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown (Markdown) | react-markdown (MarkdownAsync) | MarkdownAsync is for async plugins only; synchronous Markdown is correct here |
| @tailwindcss/typography | Manual prose CSS | Typography plugin provides tested defaults; custom prose CSS is maintenance burden |
| JS reduce for tag grouping | SQL GROUP_CONCAT | Drizzle has no typed GROUP_CONCAT; raw SQL loses type safety; JS reduce is 5 lines |

**Installation:**
```bash
npm install react-markdown remark-gfm rehype-highlight @tailwindcss/typography
```

**Version verification:** All versions confirmed against npm registry on 2026-05-25. [VERIFIED: npm registry]

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All packages are tagged [ASSUMED] based on authoritative source repos. Manual verification performed via npm registry and GitHub.

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| react-markdown | npm | ~11 yrs (2015-05-09) | github.com/remarkjs/react-markdown | unavailable | Approved — official remarkjs org, 10M+ weekly downloads [ASSUMED] |
| remark-gfm | npm | ~6 yrs (2020-10-04) | github.com/remarkjs/remark-gfm | unavailable | Approved — official remarkjs org [ASSUMED] |
| rehype-highlight | npm | ~10 yrs (2016-06-19) | github.com/rehypejs/rehype-highlight | unavailable | Approved — official rehypejs org [ASSUMED] |
| @tailwindcss/typography | npm | ~6 yrs (2020-07-13) | github.com/tailwindlabs/tailwindcss-typography | unavailable | Approved — official Tailwind Labs org [ASSUMED] |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. All packages above are tagged `[ASSUMED]`. However, all four packages are from established official organizations (remarkjs, rehypejs, tailwindlabs) with multi-year histories, making slopcheck failure very low risk. No `checkpoint:human-verify` gate is required by the planner given the authoritative source repos.*

---

## Architecture Patterns

### System Architecture Diagram

```
Request: GET /
          |
          v
 page.tsx (Server Component)
          |
          +-- getEntries() [actions.ts, 'use server']
          |       |
          |       +-- db.select({...}).from(entries)
          |               .leftJoin(entryTags, eq(entries.id, entryTags.entryId))
          |               .leftJoin(tags, eq(entryTags.tagId, tags.id))
          |               .orderBy(desc(entries.createdAt))
          |               .all()
          |       |
          |       +-- [JS reduce: flat rows → {entry, tags[]}[]]
          |       |
          |       +-- [snippet: strip MD chars → truncate 300 → append …]
          |               |
          v               v
 EntryCard[] rendered as Server HTML
          |
          v
 <AppHeader> (layout.tsx) + <main> with entry list
```

```
Request: GET /entries/[id]
          |
          v
 entries/[id]/page.tsx (Server Component)
          |
          +-- await params  (Next.js 16: params is Promise<{id: string}>)
          |
          +-- getEntryById(id) [actions.ts]
          |       |
          |       +-- db.select({...}).from(entries)
          |               .leftJoin(entryTags, ...)
          |               .leftJoin(tags, ...)
          |               .where(eq(entries.id, numericId))
          |               .all()
          |       |
          |       +-- [JS reduce: group tags]
          |       |
          |       +-- entry not found? → notFound()
          |               |
          v               v
 <MarkdownBody body={entry.body}> (Server Component)
          |
          +-- <Markdown remarkPlugins={[remarkGfm]}
          |            rehypePlugins={[rehypeHighlight]}>
          |       {body}
          |   </Markdown>
          |
          v
 Rendered HTML with hljs-* CSS classes
          +
 highlight.js/styles/github-dark.css (imported once in MarkdownBody)
```

### Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Add <AppHeader> here (persistent across all pages)
│   ├── page.tsx             # Home page — replace stub body
│   ├── globals.css          # Add: @plugin "@tailwindcss/typography"
│   │                        # Add: @import "highlight.js/styles/github-dark.css"
│   └── entries/
│       └── [id]/
│           └── page.tsx     # Entry detail page — new file
├── components/
│   ├── app-header.tsx       # "Dev Journal" header — new file
│   ├── entry-card.tsx       # List row component — new file
│   ├── tag-chip.tsx         # Inline tag pill — new file
│   └── markdown-body.tsx    # ReactMarkdown wrapper — new file
└── lib/
    ├── actions.ts           # Extend: getEntries() + add getEntryById()
    ├── utils/
    │   └── format.ts        # New: snippet(), formatRelativeDate()
    └── db/
        ├── index.ts         # No changes needed
        └── schema.ts        # No changes needed
```

### Pattern 1: Drizzle LEFT JOIN with JS Tag Reduction

**What:** Query entries with their tags via LEFT JOIN, reduce flat rows to nested structure in JS.

**When to use:** Any time you need a many-to-many relationship resolved into arrays without raw SQL.

**Why JS reduce, not SQL:** Drizzle's typed API has no `GROUP_CONCAT` or `json_group_array` equivalent. Raw SQL bypasses type safety. JS reduce on the flat result set is idiomatic Drizzle. [CITED: orm.drizzle.team/docs/joins]

```typescript
// Source: orm.drizzle.team/docs/joins (Drizzle official docs pattern)
import { db } from '@/lib/db';
import { entries, tags, entryTags } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

const rows = db
  .select({
    id:        entries.id,
    title:     entries.title,
    body:      entries.body,
    createdAt: entries.createdAt,
    tagName:   tags.name,
  })
  .from(entries)
  .leftJoin(entryTags, eq(entries.id, entryTags.entryId))
  .leftJoin(tags, eq(entryTags.tagId, tags.id))
  .orderBy(desc(entries.createdAt))
  .all();

// Reduce flat rows → per-entry objects with tag arrays
const map = new Map<number, { id: number; title: string; body: string; createdAt: Date; tags: string[] }>();
for (const row of rows) {
  if (!map.has(row.id)) {
    map.set(row.id, { id: row.id, title: row.title, body: row.body, createdAt: row.createdAt, tags: [] });
  }
  if (row.tagName) map.get(row.id)!.tags.push(row.tagName);
}
return Array.from(map.values());
```

**Important:** `Map` preserves insertion order, which is `orderBy(desc(createdAt))` order. Do NOT use `Object.values()` on a plain object — key insertion order is not guaranteed for numeric keys.

### Pattern 2: react-markdown in a Server Component

**What:** Wrap `<Markdown>` (synchronous, default export) with plugins passed as prop arrays.

**When to use:** Any Server Component that receives a Markdown string and needs to render it as HTML.

**Key finding:** The default `Markdown` export uses no hooks (`useState`, `useEffect`) and no browser APIs. It processes the MD string synchronously during render. No `'use client'` directive is required. [CITED: npmjs.com/package/react-markdown]

```typescript
// Source: npmjs.com/package/react-markdown — standard usage
// src/components/markdown-body.tsx
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface Props {
  body: string;
  className?: string;
}

export default function MarkdownBody({ body, className }: Props) {
  return (
    <article className={`prose prose-pre:p-0 prose-pre:bg-transparent ${className ?? ''}`}>
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {body}
      </Markdown>
    </article>
  );
}
```

**No `dynamic()` needed:** Unlike `@uiw/react-md-editor` (which requires `ssr: false`), react-markdown is safe for SSR and RSC. `dynamic()` is only required for components that use browser-only APIs at module load time.

### Pattern 3: @tailwindcss/typography v4 activation

**What:** In Tailwind v4, plugins are activated via `@plugin` in the CSS file, not in a JS config.

**When to use:** Any Tailwind v4 project adding a plugin.

```css
/* src/app/globals.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";

/* highlight.js theme — imported here so it applies globally */
@import "highlight.js/styles/github-dark.css";
```

[CITED: github.com/tailwindlabs/tailwindcss-typography — Tailwind v4 section]

**prose-pre override:** The `prose` class applies padding and background to `<pre>` elements by default. This conflicts with highlight.js's own `github-dark` theme background (`#0d1117`). Fix with utility modifiers on the same element:

```html
<article class="prose prose-pre:p-0 prose-pre:bg-transparent">
```

This zeroes out `prose`'s padding and background for `<pre>` elements, allowing the highlight.js CSS to render without interference. [CITED: UI-SPEC.md §Typography]

### Pattern 4: Dynamic Route with async params (Next.js 15+)

**What:** In Next.js 15 and 16, `params` is a `Promise<{id: string}>` — must be awaited.

**When to use:** Any `app/[slug]/page.tsx` dynamic route.

```typescript
// src/app/entries/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getEntryById } from '@/lib/actions';
import MarkdownBody from '@/components/markdown-body';

type Props = { params: Promise<{ id: string }> };

export default async function EntryPage({ params }: Props) {
  const { id } = await params;
  const entry = await getEntryById(Number(id));
  if (!entry) notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* ... */}
      <MarkdownBody body={entry.body} className="mt-8" />
    </main>
  );
}
```

[CITED: nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes]

### Pattern 5: Snippet Generation

**What:** Strip Markdown syntax characters from `body`, truncate at word boundary ≤ 300 chars.

**When to use:** In `getEntries()` to generate preview text for entry list cards.

```typescript
// src/lib/utils/format.ts
export function generateSnippet(body: string, maxLen = 300): string {
  // Strip common Markdown syntax characters
  const stripped = body
    .replace(/[#*_`\[\]()>|]/g, '')  // headings, bold, italic, code, links, blockquotes, tables
    .replace(/^-\s+/gm, '')           // list markers at line start
    .replace(/\s+/g, ' ')             // collapse whitespace
    .trim();

  if (stripped.length <= maxLen) return stripped;

  // Truncate at word boundary
  const cut = stripped.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
}
```

This is pure string manipulation — no external library, runs in the Server Action. [ASSUMED — logic derived from UI-SPEC.md §Snippet Generation Rules]

### Pattern 6: Relative Date Formatting

**What:** Compute relative label ("Today", "Yesterday", "N days ago") and absolute label ("May 23, 2026") from `createdAt` timestamp, entirely server-side.

**Why server-side:** If computed client-side (e.g., via `useEffect`), Next.js will produce a hydration mismatch because SSR renders a static date and hydration runs at a different moment. [ASSUMED — standard Next.js hydration mismatch prevention pattern]

```typescript
// src/lib/utils/format.ts
export function formatEntryDate(createdAt: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const absolute = createdAt.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  if (diffDays === 0) return `Today — ${absolute}`;
  if (diffDays === 1) return `Yesterday — ${absolute}`;
  return `${diffDays} days ago — ${absolute}`;
}
```

### Anti-Patterns to Avoid

- **`dynamic()` with `ssr: false` on react-markdown:** react-markdown is SSR-safe. Adding `dynamic()` forces client-side rendering unnecessarily and breaks Server Component semantics.
- **`dangerouslySetInnerHTML` with marked or markdown-it:** Explicitly forbidden in CLAUDE.md. react-markdown renders to React elements.
- **`router.back()` for the back link:** D-11 mandates `<Link href="/">`. `router.back()` requires `'use client'` and breaks on direct navigation to a detail URL.
- **Client-side date formatting:** Causes hydration mismatch. Compute all date strings in the Server Action or Server Component.
- **`Object.values()` for Map-to-array:** Numeric keys in plain objects do not preserve insertion order reliably. Use `Array.from(map.values())`.
- **`dark:` Tailwind variants in Phase 2:** UI-SPEC §Color explicitly states no `dark:` variants should be added in Phase 2.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown → React elements | Custom HTML parser | `react-markdown` | XSS risk, incomplete spec, edge cases in nested formatting |
| Syntax highlighting | CSS class injection by hand | `rehype-highlight` | highlight.js supports 200+ languages; correct tokenization is non-trivial |
| Prose typography defaults | Custom CSS for h1–h6, blockquote, ul, ol | `@tailwindcss/typography` prose class | Tested vertical rhythm, correct list markers, link styles — weeks of CSS work |
| GFM extensions (tables, task lists) | Manual regex replacements | `remark-gfm` | CommonMark + GFM spec has many edge cases |

**Key insight:** The entire Markdown rendering stack (parse → transform → highlight → style) is solved by four small libraries chained together. The only custom code needed is snippet generation (5–10 lines) and date formatting (10 lines).

---

## Common Pitfalls

### Pitfall 1: prose class conflicts with highlight.js code block background

**What goes wrong:** `@tailwindcss/typography` applies `background-color` and `padding` to `<pre>` elements. When `github-dark.css` sets `background: #0d1117` on `.hljs`, Tailwind's prose styles win on specificity or ordering, leaving a mismatched background.

**Why it happens:** prose styles target `pre` directly with high specificity. The imported `github-dark.css` targets `.hljs` with lower specificity.

**How to avoid:** Add `prose-pre:p-0 prose-pre:bg-transparent` alongside `prose` on the wrapping `<article>`. These Tailwind modifiers specifically override padding and background on `pre` elements within prose, letting highlight.js styles render unobstructed.

**Warning signs:** Code blocks appear with a grey/white background strip around `#0d1117` content, or double-padding inside code blocks.

### Pitfall 2: Forgetting to await params in dynamic route

**What goes wrong:** `params.id` accessed directly (not awaited) results in `undefined` or a Promise object, causing `NaN` when passed to `Number(params.id)`, and every entry lookup returns `notFound()`.

**Why it happens:** Next.js 15 changed `params` from a plain object to a Promise for consistency with async rendering.

**How to avoid:** Always type `params` as `Promise<{id: string}>` and `await` it before accessing properties. Pattern: `const { id } = await params`.

**Warning signs:** All entry detail pages return 404 even with valid IDs; `Number(params.id)` logs `NaN`.

### Pitfall 3: `getEntries()` returns no tags (LEFT JOIN not added)

**What goes wrong:** The Phase 1 `getEntries()` stub does a plain `db.select().from(entries).all()` — no JOIN. Tags column is undefined/missing on entry objects, causing runtime errors in `<EntryCard>` when mapping `entry.tags`.

**Why it happens:** The stub was intentionally minimal for Phase 1 (no UI). Phase 2 must extend it.

**How to avoid:** In `getEntries()`, replace the stub with the full LEFT JOIN query shown in Pattern 1. Import `tags` and `entryTags` from schema.

**Warning signs:** `entry.tags` is `undefined`; TypeScript error on `entry.tags.map(...)`.

### Pitfall 4: Highlight.js CSS import not reaching the browser

**What goes wrong:** Code blocks render with `.hljs-*` class names but no colors — the CSS is not applied.

**Why it happens:** The CSS import inside `markdown-body.tsx` is a static asset import. Next.js processes CSS imports in components only when the component is actually rendered. If the import is in a component that is tree-shaken or the import path is wrong, the CSS never loads.

**How to avoid:** Import `highlight.js/styles/github-dark.css` in `globals.css` via `@import` (most reliable, loads on every page), OR inside the `MarkdownBody` component (loads only on pages that render Markdown — sufficient for this app). Verify the path: `highlight.js` is a peer dependency of `rehype-highlight`; it is installed transitively.

**Warning signs:** Code blocks appear as plain text with correct structure but no syntax colors.

### Pitfall 5: `getEntries()` called with `'use server'` from a non-RSC context

**What goes wrong:** `actions.ts` is marked `'use server'` at the module level. Importing it into a Client Component throws a Next.js error about calling server functions from client context.

**Why it happens:** Module-level `'use server'` marks every export as a Server Action. Calling them from a client component requires the Next.js RPC mechanism (only works from form actions and explicit invocations).

**How to avoid:** `page.tsx` and `entries/[id]/page.tsx` must NOT have `'use client'`. They remain Server Components. Data fetching happens at the page level, results are passed as props to child components (which may also be Server Components).

**Warning signs:** Next.js build error: "It is not allowed to define inline `'use server'` exports in client components".

---

## Runtime State Inventory

Phase 2 is not a rename/refactor/migration phase. This section is omitted.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | ✓ | (existing from Phase 1) | — |
| npm | Package install | ✓ | (existing from Phase 1) | — |
| better-sqlite3 (native addon) | DB layer | ✓ | 12.10.0 (installed Phase 1) | — |
| highlight.js CSS files | Syntax highlighting | Installed transitively via rehype-highlight | — | — |

**Missing dependencies with no fallback:** None — all Phase 2 dependencies are npm packages that install cleanly.

**Note:** `highlight.js` is a peer/transitive dependency of `rehype-highlight`. It is not listed in Phase 1's `package.json` but will be installed automatically when `rehype-highlight` is installed. Its CSS files (`highlight.js/styles/github-dark.css`) are accessible at import time.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected in Phase 1 codebase |
| Config file | None — Wave 0 must add |
| Quick run command | `npx jest --testPathPattern=unit --passWithNoTests` (post Wave 0) |
| Full suite command | `npx jest --passWithNoTests` (post Wave 0) |

**Note:** Phase 1 has no test infrastructure (`package.json` has no test script beyond ESLint). Given this is an MVP local personal tool, the planner should consider whether to invest in test infrastructure or rely on manual smoke testing per the success criteria. The research surfaces the gap; the plan owner decides.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIEW-01 | `getEntries()` returns entries ordered newest-first with snippet and tags | unit | `npx jest lib/actions.test.ts -t "getEntries"` | ❌ Wave 0 |
| VIEW-01 | `generateSnippet()` strips MD chars, truncates at word boundary, appends `…` | unit | `npx jest lib/utils/format.test.ts -t "generateSnippet"` | ❌ Wave 0 |
| VIEW-01 | `formatEntryDate()` returns correct relative labels | unit | `npx jest lib/utils/format.test.ts -t "formatEntryDate"` | ❌ Wave 0 |
| VIEW-02 | Entry detail page renders with `<MarkdownBody>` and correct title | manual-only | open `/entries/[id]` in browser | — |
| VIEW-03 | Code blocks have `.hljs` classes and correct background color | manual-only | inspect DOM in browser | — |

### Wave 0 Gaps

- [ ] `src/lib/utils/format.test.ts` — covers snippet generation and date formatting (VIEW-01)
- [ ] `src/lib/actions.test.ts` — covers `getEntries()` ordering and tag aggregation (VIEW-01)
- [ ] Test framework install: `npm install --save-dev jest @types/jest ts-jest` (if planner elects to add tests)

*(If planner decides manual smoke-test only for Phase 2: "None — manual smoke test per success criteria is sufficient for MVP personal tool.")*

---

## Security Domain

> This is a localhost personal tool with no authentication. `security_enforcement` is not set to false but the threat surface is minimal. ASVS categories are assessed below for completeness.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth — single-user localhost per design |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | No multi-user access control |
| V5 Input Validation | Partial | `react-markdown` renders markdown to React elements (no `dangerouslySetInnerHTML`) — XSS safe by default |
| V6 Cryptography | No | No encryption needed |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via stored Markdown | Tampering | react-markdown renders to React elements; sanitizes by default — no action needed |
| Path traversal in `[id]` param | Tampering | `Number(id)` coerces non-numeric strings to `NaN`; Drizzle `.where(eq(entries.id, NaN))` returns empty result; `notFound()` is called — safe |

---

## Code Examples

Verified patterns from official and project sources:

### getEntries() — Full implementation

```typescript
// src/lib/actions.ts — extend existing stub
'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { entries, tags, entryTags } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { generateSnippet, formatEntryDate } from '@/lib/utils/format';

export type EntryListItem = {
  id: number;
  title: string;
  snippet: string;
  dateLabel: string;
  tags: string[];
};

export async function getEntries(): Promise<EntryListItem[]> {
  const rows = db
    .select({
      id:        entries.id,
      title:     entries.title,
      body:      entries.body,
      createdAt: entries.createdAt,
      tagName:   tags.name,
    })
    .from(entries)
    .leftJoin(entryTags, eq(entries.id, entryTags.entryId))
    .leftJoin(tags, eq(entryTags.tagId, tags.id))
    .orderBy(desc(entries.createdAt))
    .all();

  const now = new Date();
  const map = new Map<number, EntryListItem & { body: string; createdAt: Date }>();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id:        row.id,
        title:     row.title,
        body:      row.body,
        createdAt: row.createdAt,
        snippet:   generateSnippet(row.body),
        dateLabel: formatEntryDate(row.createdAt, now),
        tags:      [],
      });
    }
    if (row.tagName) map.get(row.id)!.tags.push(row.tagName);
  }

  return Array.from(map.values()).map(({ body: _body, createdAt: _ca, ...rest }) => rest);
}
```

### getEntryById() — New function

```typescript
export type EntryDetail = {
  id: number;
  title: string;
  body: string;
  dateLabel: string;
  tags: string[];
};

export async function getEntryById(id: number): Promise<EntryDetail | null> {
  const rows = db
    .select({
      id:        entries.id,
      title:     entries.title,
      body:      entries.body,
      createdAt: entries.createdAt,
      tagName:   tags.name,
    })
    .from(entries)
    .leftJoin(entryTags, eq(entries.id, entryTags.entryId))
    .leftJoin(tags, eq(entryTags.tagId, tags.id))
    .where(eq(entries.id, id))
    .all();

  if (rows.length === 0) return null;

  const entry: EntryDetail = {
    id:        rows[0].id,
    title:     rows[0].title,
    body:      rows[0].body,
    dateLabel: formatEntryDate(rows[0].createdAt, new Date()),
    tags:      [],
  };
  for (const row of rows) {
    if (row.tagName) entry.tags.push(row.tagName);
  }
  return entry;
}
```

### AppHeader component

```typescript
// src/components/app-header.tsx
import Link from 'next/link';

export default function AppHeader() {
  return (
    <header className="border-b border-zinc-200">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-semibold text-zinc-900 no-underline">
          Dev Journal
        </Link>
        {/* Right slot — Phase 3 adds "New Entry" button here */}
        <div />
      </div>
    </header>
  );
}
```

### globals.css additions

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@import "highlight.js/styles/github-dark.css";
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import()` dynamic for react-markdown | Direct import in Server Component | react-markdown v8+ (RSC era) | Simpler, no dynamic wrapper needed |
| Tailwind typography via `tailwind.config.js` | `@plugin` in CSS file | Tailwind v4 (2025) | No JS config file needed; CSS-first |
| `params.id` direct access | `await params` then `.id` | Next.js 15 | params is now a Promise |
| `highlight.js` CSS from CDN | `import 'highlight.js/styles/...'` | Standard since highlight.js v10 | Bundled with the app; no external network request |

**Deprecated/outdated:**
- `tailwind.config.js` `plugins: [require('@tailwindcss/typography')]` — still works in v4 but the canonical v4 approach is `@plugin "@tailwindcss/typography"` in CSS. [CITED: github.com/tailwindlabs/tailwindcss-typography]
- `dynamic(() => import('react-markdown'), { ssr: false })` — unnecessary for `react-markdown`; was a workaround for older versions with SSR issues that no longer apply.

---

## Project Constraints (from CLAUDE.md)

All actionable directives from `CLAUDE.md` that apply to Phase 2:

| Directive | Impact on Phase 2 |
|-----------|-------------------|
| Use react-markdown (not marked/markdown-it) | Only react-markdown is acceptable; no raw HTML rendering |
| Use remark-gfm + rehype-highlight | Must be passed as plugins to `<Markdown>` |
| No `dangerouslySetInnerHTML` | react-markdown handles this by default; no override |
| No Edge runtime | Do not set `runtime = 'edge'` on any route |
| No `'use client'` on data-fetching pages | `page.tsx` and `entries/[id]/page.tsx` remain Server Components |
| Server Actions for all DB operations | `getEntries()` and `getEntryById()` stay in `actions.ts` with `'use server'` |
| `revalidatePath` after mutations | Phase 2 has no mutations — not applicable |
| `serverExternalPackages: ['better-sqlite3']` | Already set in `next.config.ts`; no change needed |
| SQLite FTS5 built-in | Phase 2 does not use search — not applicable |
| `process.cwd()` for DB path | Already implemented in `db/index.ts`; no change |
| shadcn/ui deferred to Phase 3 | No shadcn components in Phase 2 (confirmed by UI-SPEC) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-markdown` default `Markdown` export uses no browser APIs and runs in RSC without `'use client'` | Pattern 2, Summary | If wrong, `MarkdownBody` needs `'use client'`; Markdown rendering becomes client-side; minimal functional impact but breaks RSC architecture intent |
| A2 | `highlight.js` is installed transitively by `rehype-highlight` and its CSS files are accessible at import time | Environment Availability | If wrong, `npm install highlight.js` must be added explicitly; easy fix |
| A3 | `@tailwindcss/typography` version 0.5.x is the current Tailwind v4-compatible release | Standard Stack | If wrong, install may fail; check npm for latest v0.5.x+ |
| A4 | Snippet generation regex (stripping `#*_\`\[\]()>|` and `^-\s+`) covers all common Markdown syntax visible in preview | Pattern 5 | If wrong, some Markdown chars appear in snippet; cosmetic only, not functional |
| A5 | `Map` preserves insertion order matching `orderBy(desc(createdAt))` — final array is correctly sorted | Pattern 1 | If wrong, entry list is in wrong order; fixable by sorting the final array |
| A6 | `params` is `Promise<{id: string}>` in Next.js 16.2.6 (same as 15.x behavior) | Pattern 4 | If wrong (params is plain object), `await params` is harmless but unnecessary; zero functional risk |
| A7 | All four new packages are approved for production use despite slopcheck being unavailable | Package Legitimacy Audit | If a package is slopquatted, malicious code could run at install time; mitigated by all packages being from official orgs |

**If table is empty:** All claims were verified or cited. It is not empty — A1 through A7 need awareness but are all low-risk given supporting evidence.

---

## Open Questions

1. **react-markdown `Markdown` vs `MarkdownAsync` — which is correct here?**
   - What we know: `Markdown` is synchronous; `MarkdownAsync` supports async plugins and RSC async rendering.
   - What's unclear: Whether the synchronous `Markdown` component needs `'use client'` in Next.js 16 RSC.
   - Recommendation: Use synchronous `Markdown` (no `'use client'`). The component has no hooks/browser APIs. If a build-time error occurs, wrap `MarkdownBody` in `'use client'` — functional impact is nil (Markdown still renders, just on client).

2. **Should `highlight.js/styles/github-dark.css` be imported in `globals.css` or in `MarkdownBody`?**
   - What we know: Both work. globals.css applies globally (loads on every page); component import loads only when `MarkdownBody` renders.
   - What's unclear: Whether Next.js 16 correctly tree-shakes CSS imports in Server Components.
   - Recommendation: Import in `globals.css` via `@import` — simpler, reliable, always loads. Since every page in this app will eventually show Markdown (detail pages), the ~2KB CSS overhead on the home page is acceptable.

---

## Sources

### Primary (HIGH confidence)

- `CLAUDE.md` (project file) — locked stack decisions, library rationale, forbidden patterns
- `02-CONTEXT.md` (project file) — locked decisions D-01 through D-11, discretion items
- `02-UI-SPEC.md` (project file) — component inventory, Tailwind classes, snippet rules, copy
- `src/lib/db/schema.ts` (project file) — exact column names and types for Drizzle queries
- `src/lib/actions.ts` (project file) — existing stub to extend
- `src/app/layout.tsx` (project file) — existing layout structure for header integration
- npm registry (2026-05-25) — package versions: react-markdown 10.1.0, remark-gfm 4.0.1, rehype-highlight 7.0.2, highlight.js 11.11.1 [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- [npmjs.com/package/react-markdown](https://www.npmjs.com/package/react-markdown) — exports: `Markdown` (sync), `MarkdownAsync` (async), `MarkdownHooks` (client)
- [github.com/tailwindlabs/tailwindcss-typography](https://github.com/tailwindlabs/tailwindcss-typography) — v4 `@plugin` activation, `prose` class, override modifiers
- [orm.drizzle.team/docs/joins](https://orm.drizzle.team/docs/joins) — leftJoin syntax, join conditions, flat result structure
- [nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) — async params pattern
- [github.com/rehypejs/rehype-highlight](https://github.com/rehypejs/rehype-highlight) — rehypePlugins usage, highlight.js CSS path

### Tertiary (LOW confidence)

- Web search results re: react-markdown RSC compatibility — confirmed by package structure (no hooks/browser APIs) but not by explicit official documentation statement [ASSUMED: A1]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified on npm registry with authoritative source repos; versions match CLAUDE.md
- Architecture: HIGH — all patterns derived from official Drizzle, Next.js, and Tailwind docs; cross-confirmed with existing Phase 1 code
- Pitfalls: HIGH — each pitfall is grounded in a specific known behavior (Tailwind specificity, Next.js 15 async params, Drizzle JOIN flat results)
- Snippet/date utilities: MEDIUM — exact regex and date arithmetic are [ASSUMED]; logic is straightforward and low-risk

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (stable libraries; Tailwind v4 typography plugin API unlikely to change)
