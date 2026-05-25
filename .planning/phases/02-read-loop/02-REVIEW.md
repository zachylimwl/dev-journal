---
phase: 02-read-loop
reviewed: 2026-05-25T11:04:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/lib/utils/format.ts
  - src/lib/actions.ts
  - src/app/globals.css
  - src/components/app-header.tsx
  - src/components/tag-chip.tsx
  - src/components/markdown-body.tsx
  - src/components/entry-card.tsx
  - src/app/entries/[id]/page.tsx
  - src/app/layout.tsx
  - src/app/page.tsx
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: fixed
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-25T11:04:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed the Phase 2 read-loop implementation: server actions, utility functions, layout, and all UI components. The implementation is structurally sound — Server Components are used correctly, react-markdown is integrated safely, FTS5 triggers are correct, and the Drizzle query pattern for aggregating tags via left-join is valid.

One critical defect was found: any non-numeric URL segment (e.g. `/entries/abc`) will throw an unhandled exception inside the DB driver rather than returning a clean 404. Three warnings cover a rendering bug (Geist font never applied), a date formatting failure for invalid timestamps, and missing TypeScript narrowing after `notFound()`. Three info items cover boilerplate metadata, a dark-mode style gap, and a trailing-space class string.

---

## Critical Issues

### CR-01: Non-numeric route segment causes 500 instead of 404

**File:** `src/app/entries/[id]/page.tsx:16`

**Issue:** `Number(id)` on a non-numeric string (e.g. `"abc"`, `"../etc"`) yields `NaN`. This `NaN` value is then passed to `getEntryById(NaN)`, which calls `eq(entries.id, NaN)` inside Drizzle. `better-sqlite3` does not accept `NaN` as a bound parameter — it throws a `TypeError` at runtime. The result is an unhandled 500 error page instead of the expected 404. The comment on line 5 ("Drizzle returns null; notFound() fires") is incorrect for the `NaN` case.

**Fix:**
```typescript
// src/app/entries/[id]/page.tsx
export default async function EntryPage({ params }: Props) {
  const { id } = await params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) notFound();  // clean 404 for non-numeric segments

  const entry = await getEntryById(numericId);
  if (!entry) notFound();

  // TypeScript now knows entry is EntryDetail (not null) below this point
  return ( /* ... */ );
}
```

---

## Warnings

### WR-01: Geist font loaded but never rendered — Arial overrides it

**File:** `src/app/globals.css:27`

**Issue:** The `body {}` rule sets `font-family: Arial, Helvetica, sans-serif` directly. `layout.tsx` applies the Geist CSS variable classes (`geistSans.variable`) to `<html>`, wiring `--font-geist-sans` correctly. However, because the `body` element does not carry a `font-sans` Tailwind utility class, the explicit `body { font-family: Arial ... }` rule wins the cascade. Geist is downloaded and injected but never rendered. The entire app displays in Arial.

**Fix:** Replace the hardcoded font stack with the Tailwind `font-sans` token so the theme variable is honoured, or add `font-sans` to `<body>` in `layout.tsx`:

```css
/* globals.css — option A: remove the explicit rule and let Tailwind handle it */
body {
  background: var(--background);
  color: var(--foreground);
  /* remove font-family line — Tailwind applies font-sans from @theme */
}
```

```tsx
/* layout.tsx — option B: add font-sans class to <body> */
<body className="min-h-full flex flex-col font-sans">
```

Either option (or both) resolves the conflict. Option B is more explicit and pairs correctly with the existing Tailwind setup.

---

### WR-02: `formatEntryDate` returns garbled output for invalid timestamps

**File:** `src/lib/utils/format.ts:19-29`

**Issue:** If `createdAt` is not a valid `Date` — e.g. Drizzle returns `null` for a missing column value, or the stored integer is `0` from a schema migration edge case — then `createdAt.getTime()` returns `NaN`. `diffMs` and `diffDays` become `NaN`. Both `=== 0` and `=== 1` comparisons fail (NaN is not equal to anything), and the function falls through to return `"NaN days ago — Invalid Date"` visible to the user. No type guard or validity check exists.

**Fix:**
```typescript
export function formatEntryDate(createdAt: Date, now: Date = new Date()): string {
  if (!(createdAt instanceof Date) || isNaN(createdAt.getTime())) {
    return 'Unknown date';
  }
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  // ... rest unchanged
}
```

---

### WR-03: TypeScript type safety gap — `entry` not narrowed after `notFound()`

**File:** `src/app/entries/[id]/page.tsx:18`

**Issue:** `getEntryById` returns `Promise<EntryDetail | null>`. After `if (!entry) notFound()`, TypeScript does not automatically narrow `entry` to `EntryDetail` because `notFound()` is typed as `() => never` but the control-flow narrowing only applies if TypeScript can prove the branch exits. In current TypeScript versions this narrowing does work correctly — however, `entry` is subsequently used without a return-type-narrowing `return` before `notFound()`. If a future TypeScript version or a custom type checker does not recognise the `never` return, every subsequent `entry.title` access would be flagged. The robust pattern is to add `return` before the JSX block or restructure:

**Fix:**
```typescript
if (!entry) return notFound();  // 'return notFound()' makes the exit explicit to TypeScript
```

---

## Info

### IN-01: Boilerplate metadata description not updated

**File:** `src/app/layout.tsx:19`

**Issue:** `description: "Generated by create next app"` is the Next.js scaffold default. It will appear in browser tab tooltips and any page metadata consumers.

**Fix:**
```typescript
export const metadata: Metadata = {
  title: "Dev Journal",
  description: "Personal developer journal — write and search daily entries.",
};
```

---

### IN-02: App header has no dark mode border colour

**File:** `src/components/app-header.tsx:8`

**Issue:** The header uses `border-zinc-200`, which is a light-mode colour. `globals.css` defines a dark background (`#0a0a0a`) via `prefers-color-scheme: dark`, but the border colour has no dark variant. In dark mode the border becomes near-invisible (zinc-200 on near-black). No other component in scope applies dark-mode variants either — this is a systemic gap rather than an isolated defect.

**Fix:**
```tsx
<header className="border-b border-zinc-200 dark:border-zinc-700">
```

---

### IN-03: Trailing whitespace in `MarkdownBody` class string when `className` is undefined

**File:** `src/components/markdown-body.tsx:18`

**Issue:** The template literal `` `prose prose-pre:p-0 prose-pre:bg-transparent ${className ?? ''}` `` appends an empty string (with a leading space from the template) when `className` is not provided. The rendered class attribute becomes `"prose prose-pre:p-0 prose-pre:bg-transparent "` — trailing space. This is harmless to browsers but is a minor quality issue that can be resolved with `clsx`/`cn` or a conditional join.

**Fix:**
```typescript
import { cn } from '@/lib/utils'; // shadcn/ui utility (already available if shadcn is set up)

<article className={cn('prose prose-pre:p-0 prose-pre:bg-transparent', className)}>
```

Or without a utility:
```typescript
className={['prose prose-pre:p-0 prose-pre:bg-transparent', className].filter(Boolean).join(' ')}
```

---

_Reviewed: 2026-05-25T11:04:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
