# Phase 2: Read Loop - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 9 new/modified files
**Analogs found:** 5 / 9 (4 files have no codebase analog — use RESEARCH.md patterns)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/actions.ts` | service | CRUD | `src/lib/actions.ts` (self — extend stub) | exact |
| `src/lib/utils/format.ts` | utility | transform | `src/lib/actions.ts` (pure function style) | partial |
| `src/app/layout.tsx` | config/layout | request-response | `src/app/layout.tsx` (self — modify) | exact |
| `src/app/page.tsx` | component (RSC) | request-response | `src/app/page.tsx` (self — replace body) | exact |
| `src/app/entries/[id]/page.tsx` | component (RSC) | request-response | `src/app/page.tsx` | role-match |
| `src/components/app-header.tsx` | component (RSC) | request-response | none | no analog |
| `src/components/entry-card.tsx` | component (RSC) | request-response | none | no analog |
| `src/components/tag-chip.tsx` | component (RSC) | request-response | none | no analog |
| `src/components/markdown-body.tsx` | component (RSC) | transform | none | no analog |
| `src/app/globals.css` | config | — | `src/app/globals.css` (self — extend) | exact |

---

## Pattern Assignments

### `src/lib/actions.ts` (service, CRUD) — extend existing stub

**Analog:** `src/lib/actions.ts` (self, lines 1–15)

**Existing module header + imports pattern** (lines 1–10):
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { entries } from '@/lib/db/schema';
```

**Established query pattern** (line 14):
```typescript
return db.select().from(entries).all();
```

**Extension pattern — add these imports** (merge into existing import block):
```typescript
import { entries, tags, entryTags } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { generateSnippet, formatEntryDate } from '@/lib/utils/format';
```

**Core CRUD extension — replace `getEntries()` stub body:**
```typescript
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

**New function — `getEntryById()`** (add after `getEntries()`):
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

**Critical rules from schema.ts (lines 6–29):**
- Column names: `entries.id`, `entries.title`, `entries.body`, `entries.createdAt`, `entries.updatedAt`
- Junction table export name: `entryTags` (camelCase), SQL table is `entry_tags`
- Tags export: `tags` with columns `tags.id`, `tags.name`
- `createdAt` is `integer('created_at', { mode: 'timestamp' })` — Drizzle returns a `Date` object

---

### `src/lib/utils/format.ts` (utility, transform) — new file

**Analog:** `src/lib/actions.ts` — pure function export style (no analog for this role)

**Pattern to copy — module header style** (from actions.ts lines 1–6):
```typescript
// src/lib/utils/format.ts
// Pure utility functions for snippet generation and date formatting.
// No external dependencies — runs in Server Actions and Server Components.
```

**Core transform — snippet generation:**
```typescript
export function generateSnippet(body: string, maxLen = 300): string {
  const stripped = body
    .replace(/[#*_`\[\]()>|]/g, '')   // headings, bold, italic, code, links, blockquotes, tables
    .replace(/^-\s+/gm, '')            // list markers at line start
    .replace(/\s+/g, ' ')              // collapse whitespace
    .trim();

  if (stripped.length <= maxLen) return stripped;

  const cut = stripped.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
}
```

**Core transform — relative date formatting:**
```typescript
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

**Why server-side only:** Prevents hydration mismatch — do not export these for client use.

---

### `src/app/layout.tsx` (layout, request-response) — modify existing

**Analog:** `src/app/layout.tsx` (self, lines 1–33)

**Existing structure to preserve** (lines 1–33):
```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",      // update to "Dev Journal"
  description: "Generated by create next app",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

**Modification — add `<AppHeader>` import and slot it above `{children}`:**
```typescript
import AppHeader from '@/components/app-header';

// Inside <body>:
<body className="min-h-full flex flex-col">
  <AppHeader />
  {children}
</body>
```

**D-10 constraint:** The `<AppHeader>` component must have a right-side slot (`<div />` placeholder) for Phase 3's "New Entry" button. See app-header.tsx pattern below.

---

### `src/app/page.tsx` (RSC component, request-response) — replace body

**Analog:** `src/app/page.tsx` (self, lines 1–21)

**Pattern to preserve — Server Component structure** (lines 8–11):
```typescript
import { getEntries } from '@/lib/actions';

export default async function Home() {
  const entries = await getEntries();
  // ... render
}
```

**No `'use client'` — this must remain an async Server Component.** DB imports run server-side only.

**Extension — replace `<main>` body:**
```typescript
import { getEntries } from '@/lib/actions';
import EntryCard from '@/components/entry-card';

export default async function Home() {
  const entries = await getEntries();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {entries.length === 0 ? (
        <p className="text-zinc-500">No entries yet.</p>
      ) : (
        <div className="divide-y divide-zinc-200">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </main>
  );
}
```

---

### `src/app/entries/[id]/page.tsx` (RSC component, request-response) — new file

**Analog:** `src/app/page.tsx` (same async Server Component pattern, lines 8–21)

**Pattern to copy — async Server Component with data fetch:**
```typescript
import { getEntries } from '@/lib/actions';

export default async function Home() {
  const entries = await getEntries();
```

**Adaptation for dynamic route — Next.js 16 async params:**
```typescript
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEntryById } from '@/lib/actions';
import MarkdownBody from '@/components/markdown-body';

type Props = { params: Promise<{ id: string }> };

export default async function EntryPage({ params }: Props) {
  const { id } = await params;           // MUST await — params is Promise in Next.js 15+
  const entry = await getEntryById(Number(id));
  if (!entry) notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← All entries
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-zinc-900">{entry.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">{entry.dateLabel}</p>
      {entry.tags.length > 0 && (
        <div className="mt-2 flex gap-2">
          {entry.tags.map((tag) => (
            <TagChip key={tag} name={tag} />
          ))}
        </div>
      )}
      <MarkdownBody body={entry.body} className="mt-8" />
    </main>
  );
}
```

**Critical:** `Number(id)` coerces non-numeric params to `NaN`; Drizzle returns empty result; `notFound()` fires — path traversal safe by design.

---

### `src/app/globals.css` (config) — extend existing

**Analog:** `src/app/globals.css` (self, lines 1–27)

**Existing line 1 (preserve):**
```css
@import "tailwindcss";
```

**Add after line 1 — Tailwind v4 plugin activation (NOT in tailwind.config.js):**
```css
@plugin "@tailwindcss/typography";
@import "highlight.js/styles/github-dark.css";
```

**Why `@plugin` not `plugins: [require(...)]`:** Tailwind v4 uses CSS-first config. The `tailwind.config.js` approach still works but is not canonical in v4.

---

### `src/components/app-header.tsx` (RSC component, request-response) — new file

**Analog:** None — first component in the codebase.

**Pattern source:** RESEARCH.md `AppHeader component` example + layout.tsx import conventions.

**Import style to match** (from layout.tsx line 1–3):
```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
```

**Component pattern:**
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

**D-10 constraint:** The `<div />` right-slot placeholder MUST remain. Phase 3 replaces it with the "New Entry" button without restructuring the header.

---

### `src/components/entry-card.tsx` (RSC component, request-response) — new file

**Analog:** None — first component in the codebase.

**Type import pattern — reference `EntryListItem` from actions.ts:**
```typescript
import type { EntryListItem } from '@/lib/actions';
import Link from 'next/link';
import TagChip from '@/components/tag-chip';
```

**D-04 visual style:** Divider-separated rows, no card box/shadow/border. The `divide-y` on the parent list (`page.tsx`) provides the separators — `EntryCard` itself has no border.

**Component pattern:**
```typescript
// src/components/entry-card.tsx
import type { EntryListItem } from '@/lib/actions';
import Link from 'next/link';
import TagChip from '@/components/tag-chip';

interface Props {
  entry: EntryListItem;
}

export default function EntryCard({ entry }: Props) {
  return (
    <article className="py-5">
      <Link href={`/entries/${entry.id}`} className="group block">
        <h2 className="text-lg font-semibold text-zinc-900 group-hover:underline">
          {entry.title}
        </h2>
      </Link>
      <p className="mt-1 text-xs text-zinc-400">{entry.dateLabel}</p>
      {entry.snippet && (
        <p className="mt-2 text-sm text-zinc-600 line-clamp-3">{entry.snippet}</p>
      )}
      {entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <TagChip key={tag} name={tag} />
          ))}
        </div>
      )}
    </article>
  );
}
```

---

### `src/components/tag-chip.tsx` (RSC component, request-response) — new file

**Analog:** None — first component in the codebase.

**Component pattern (atomic, no dependencies):**
```typescript
// src/components/tag-chip.tsx
interface Props {
  name: string;
}

export default function TagChip({ name }: Props) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
      {name}
    </span>
  );
}
```

---

### `src/components/markdown-body.tsx` (RSC component, transform) — new file

**Analog:** None — first Markdown rendering component in codebase.

**Pattern source:** RESEARCH.md Pattern 2 (react-markdown in Server Component).

**No `'use client'` required** — `react-markdown`'s synchronous `Markdown` export uses no hooks or browser APIs. Runs in RSC.

**No `dynamic()` import** — unlike `@uiw/react-md-editor`, react-markdown is SSR-safe.

**Component pattern:**
```typescript
// src/components/markdown-body.tsx
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

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

**`prose-pre:p-0 prose-pre:bg-transparent` is mandatory** — without it, `@tailwindcss/typography`'s `<pre>` styles conflict with `github-dark.css` background `#0d1117`, producing a double-background visual artifact.

**CSS import location:** Import `highlight.js/styles/github-dark.css` in `globals.css` via `@import` (not inside this component) — more reliable in Next.js 16, loads on every page.

---

## Shared Patterns

### Server Component module shape
**Source:** `src/app/page.tsx` lines 1–21 and `src/lib/actions.ts` lines 1–15
**Apply to:** `src/app/entries/[id]/page.tsx`, `src/components/app-header.tsx`, `src/components/entry-card.tsx`, `src/components/tag-chip.tsx`, `src/components/markdown-body.tsx`

Rules:
- No `'use client'` directive on any Phase 2 file
- Async function for pages that fetch data; regular function for pure-render components
- Import path alias: `@/lib/...`, `@/components/...` (established by existing files)

```typescript
// Page that fetches:
export default async function PageName() { ... }

// Pure render component:
export default function ComponentName({ prop }: Props) { ... }
```

### DB query + Drizzle pattern
**Source:** `src/lib/actions.ts` lines 8–14 + `src/lib/db/index.ts` lines 75
**Apply to:** `src/lib/actions.ts` (extended `getEntries`, new `getEntryById`)

```typescript
import { db } from '@/lib/db';           // singleton, always this import
import { entries } from '@/lib/db/schema'; // named table exports from schema
// db.select().from(table).all()          // synchronous, no await on the Drizzle call itself
```

Note: `db.select()...all()` is synchronous (better-sqlite3). The `async` on `getEntries()` / `getEntryById()` is required only because they are Server Actions (`'use server'`), not because the DB call is async.

### Tailwind class conventions
**Source:** `src/app/layout.tsx` lines 27–31 + `src/app/page.tsx` lines 14–19
**Apply to:** All new component files

```typescript
// Existing layout uses:
"min-h-full flex flex-col"          // body
"p-8"                               // page main (Phase 1 stub — Phase 2 replaces with max-w-5xl pattern)

// Phase 2 establishes:
"max-w-5xl mx-auto px-4 py-8"      // all page <main> wrappers (D-07, D-08)
"text-zinc-*"                       // zinc color scale for text (established in Phase 1 stub)
"border-zinc-200"                   // zinc for borders
```

**No `dark:` variants** — Phase 2 explicitly forbids them (RESEARCH.md Anti-Patterns).

### TypeScript type export pattern
**Source:** `src/lib/actions.ts` (to be established in this phase)
**Apply to:** `src/components/entry-card.tsx`

```typescript
// In actions.ts — export types alongside functions:
export type EntryListItem = { ... };
export type EntryDetail = { ... };

// In components — import type (not value import):
import type { EntryListItem } from '@/lib/actions';
```

---

## No Analog Found

Files that have no close match in the existing codebase (planner uses RESEARCH.md patterns):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/app-header.tsx` | component | request-response | No components exist yet; first component file |
| `src/components/entry-card.tsx` | component | request-response | No components exist yet |
| `src/components/tag-chip.tsx` | component | request-response | No components exist yet |
| `src/components/markdown-body.tsx` | component | transform | No Markdown rendering components exist yet |
| `src/lib/utils/format.ts` | utility | transform | No utils directory exists yet |

For these files, planner should reference:
- RESEARCH.md Pattern 2 for `markdown-body.tsx`
- RESEARCH.md Pattern 5 for `generateSnippet()` in `format.ts`
- RESEARCH.md Pattern 6 for `formatEntryDate()` in `format.ts`
- RESEARCH.md `AppHeader component` example for `app-header.tsx`

---

## Metadata

**Analog search scope:** `src/app/`, `src/lib/`, `src/components/` (components dir does not exist yet)
**Files scanned:** 6 existing files (all Phase 1 output)
**Pattern extraction date:** 2026-05-25
