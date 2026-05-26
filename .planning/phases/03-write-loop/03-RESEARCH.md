# Phase 3: Write Loop — Research

**Researched:** 2026-05-25
**Domain:** Next.js App Router mutations, @uiw/react-md-editor, shadcn/ui AlertDialog, autosave debounce, tag normalization
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Entry cards link to read-only detail page (`/entries/[id]`). Edit button on detail page routes to `/entries/[id]/edit`.
- **D-02:** "New Entry" button lives in existing `AppHeader`, routes to `/new`.
- **D-03:** `/new` page creates a DB record on first autosave (title or body first typed) — not on page load.
- **D-04:** After first autosave of a new entry, redirect to `/entries/[id]/edit` so URL is bookmarkable.
- **D-05:** Existing tags render as chip UI with × buttons — reuses `TagChip` component from Phase 2.
- **D-06:** Adding a tag: text input field; press Enter or comma to create a new chip.
- **D-07:** Tag input zone positioned below title, above Markdown editor.
- **D-08:** Tags normalized (trimmed, lowercased, deduplicated, empties removed) on chip creation AND on save.
- **D-09:** Use shadcn/ui `AlertDialog` for delete confirmation.
- **D-10:** Delete available on both detail page (`/entries/[id]`) and edit page (`/entries/[id]/edit`).
- **D-11:** After deletion, redirect to home page (`/`).
- **D-12:** Autosave status: small status text label in editor header area, top-right.
- **D-13:** Three states: "Saving..." → "Saved just now" → fades out after a few seconds.

### Claude's Discretion

- Editor layout within `/new` and `/entries/[id]/edit`: exact header/toolbar/padding beyond title → tags → body order.
- Whether to use a shared `EditorForm` component between `/new` and `/entries/[id]/edit` or two separate page files.
- Autosave fade-out duration (suggested: 2–3 seconds).
- Exact wording and destructive-button color in the AlertDialog.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENTR-01 | User can create a new journal entry with a title and free-form Markdown body | `createEntry` Server Action; `/new` page with EditorForm; D-03/D-04 first-autosave-then-redirect pattern |
| ENTR-02 | User can edit any existing entry | `updateEntry` Server Action; `/entries/[id]/edit` page with EditorForm pre-populated from `getEntryById` |
| ENTR-03 | User can delete an entry with a confirmation prompt | `deleteEntry` Server Action; AlertDialog component on both detail + edit pages; D-09/D-10/D-11 |
| ENTR-04 | Entry changes are auto-saved while writing (debounced ~500ms) — no manual Save button | `useRef` + `useCallback` debounce in EditorForm Client Component; status label; D-12/D-13 |
| TAG-01 | User can add one or more project tags to an entry | Tag chip input zone below title; Enter/comma creates chip; triggers autosave; D-05/D-06/D-07 |
| TAG-02 | Tags normalized (trimmed, lowercased, deduplicated, empties removed) | Client-side on chip creation AND server-side in `setEntryTags`; D-08 |
</phase_requirements>

---

## Summary

Phase 3 adds the write layer on top of the Phase 1–2 read foundation. The key technical challenges are: (1) wiring `@uiw/react-md-editor` as a Client Component with dynamic import, (2) implementing the "create on first autosave then redirect" pattern (D-03/D-04) without race conditions or orphan records, and (3) bootstrapping shadcn/ui's `AlertDialog` in a project that currently has no `components.json`.

The existing codebase is clean and well-structured. All three tables (`entries`, `tags`, `entry_tags`) are in place. FTS5 triggers already fire on INSERT/UPDATE/DELETE — no FTS work needed in Phase 3. The `actions.ts` `'use server'` module pattern is established; Phase 3 extends it with four new actions: `createEntry`, `updateEntry`, `deleteEntry`, `setEntryTags`.

The biggest non-obvious decision is the redirect mechanism after first autosave. The recommended pattern is: `createEntry` returns `{ id: number }` to the Client Component, which then calls `router.replace('/entries/${id}/edit')` client-side. Do NOT call `redirect()` inside the Server Action for autosave — `redirect()` throws `NEXT_REDIRECT` and is designed for full-page navigations, not fire-and-forget autosave calls that should continue working after navigation.

**Primary recommendation:** Use a shared `EditorForm` Client Component for both `/new` and `/entries/[id]/edit`. Server Actions return the entry ID on create; Client Component drives navigation. AlertDialog installed via `npx shadcn@latest add alert-dialog` which will prompt to create `components.json` if absent (this is safe — say yes).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Entry CRUD mutations | API / Backend (Server Actions) | — | better-sqlite3 is Node.js-only; mutations must run server-side |
| Editor state (title, body, tags) | Browser / Client | — | @uiw/react-md-editor is a browser component; state lives in Client Component |
| Autosave debounce logic | Browser / Client | — | Debounce runs in the browser; fires Server Action as side effect |
| Redirect after first save | Browser / Client | — | `router.replace()` in Client Component after Server Action returns new ID |
| Tag normalization (display) | Browser / Client | — | Normalize on chip creation before adding to local state |
| Tag normalization (persistence) | API / Backend (Server Actions) | — | Normalize again in `setEntryTags` as server-side guard |
| Delete confirmation UI | Browser / Client | — | AlertDialog is interactive; must be Client Component |
| FTS5 index sync | Database / Storage | — | Already handled by existing triggers — no Phase 3 work needed |
| Page data loading (edit page) | Frontend Server (SSR) | — | `getEntryById` called in server page wrapper; passes data to EditorForm as props |

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@uiw/react-md-editor` | 4.1.1 | Split-pane Markdown editor | Locked in CLAUDE.md; Markdown-native raw string I/O; dynamic import with ssr:false |
| `better-sqlite3` | 12.10.0 | SQLite driver | Already installed; synchronous API correct for Server Actions |
| `drizzle-orm` | 0.45.2 | Query builder | Already installed; typed mutations with `.returning().all()` |
| `next` | 16.2.6 | App Router framework | Already installed |

### New — Phase 3 installs

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-alert-dialog` | 1.1.15 | AlertDialog primitive | Installed by `npx shadcn@latest add alert-dialog` |
| `class-variance-authority` | 0.7.1 | Variant styling utility | Installed by shadcn CLI; required by generated component |
| `clsx` | 2.1.1 | Class merging | Installed by shadcn CLI |
| `tailwind-merge` | 3.6.0 | Tailwind class deduplication | Installed by shadcn CLI |
| `lucide-react` | 1.16.0 | Icon set (shadcn dependency) | Installed by shadcn CLI; `@uiw/react-md-editor` uses text labels, not icons |

All versions verified via `npm view` on 2026-05-25. [VERIFIED: npm registry]

### Installation

```bash
# Bootstrap shadcn/ui AlertDialog (will prompt to create components.json — say yes)
npx shadcn@latest add alert-dialog

# @uiw/react-md-editor — already in package.json? Check first:
npm view @uiw/react-md-editor version  # 4.1.1 confirmed
# Install if not present:
npm install @uiw/react-md-editor
```

**Note:** `@uiw/react-md-editor` is NOT yet in `package.json` (current deps confirmed from reading the file). It must be installed in Wave 0 alongside the shadcn bootstrap.

---

## Package Legitimacy Audit

> slopcheck was not available at research time. All packages tagged [ASSUMED] for provenance. The planner must gate each new install behind a `checkpoint:human-verify` task or verify manually.

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `@uiw/react-md-editor` | npm | ~7 yrs (created 2019-08-19) | github.com/uiwjs/react-md-editor | unavailable | [ASSUMED] — well-known, 7yr history, official homepage |
| `@radix-ui/react-alert-dialog` | npm | ~5 yrs (created 2020-12-15) | github.com/radix-ui/primitives | unavailable | [ASSUMED] — official Radix UI org |
| `class-variance-authority` | npm | established | github.com/joe-bell/cva | unavailable | [ASSUMED] — standard shadcn dependency |
| `clsx` | npm | established | — | unavailable | [ASSUMED] — widely used |
| `tailwind-merge` | npm | established | github.com/dcastil/tailwind-merge | unavailable | [ASSUMED] — standard in Tailwind ecosystem |
| `lucide-react` | npm | ~5 yrs (created 2020-10-19) | github.com/lucide-icons/lucide | unavailable | [ASSUMED] — official Lucide org |

**Packages removed due to [SLOP]:** none
**Packages flagged [SUS]:** none — all packages have multi-year histories and known source repos.

*Planner note: All six new packages are from established, well-known sources. A brief human review before `npm install` is sufficient — a full `checkpoint:human-verify` gate per package is not necessary given the provenance evidence above.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (Client Component: EditorForm)
  │
  ├─ title/body onChange → debounce 500ms → autosave timer (useRef)
  │                                              │
  │                                              ▼
  │                                   Server Action: createEntry() or updateEntry()
  │                                              │
  │                                              ▼
  │                                   better-sqlite3 → journal.db
  │                                   FTS5 triggers fire automatically
  │                                              │
  │         new entry: returns { id }            │
  │◄─────────────────────────────────────────────┘
  │
  ├─ router.replace('/entries/[id]/edit')   ← first save only
  │
  ├─ tag Enter/comma → normalize → local chip state → trigger autosave
  │
  └─ Delete button → AlertDialog opens
                          │
                    confirm → deleteEntry(id) → redirect('/')
                    cancel  → dialog closes
```

### Recommended Project Structure (Phase 3 additions)

```
src/
├── app/
│   ├── new/
│   │   └── page.tsx              # Server Component wrapper → renders EditorForm (mode="new")
│   └── entries/
│       └── [id]/
│           ├── page.tsx          # Phase 2 — add Edit + Delete buttons (stays Server Component)
│           └── edit/
│               └── page.tsx      # Server Component wrapper → getEntryById → renders EditorForm (mode="edit")
├── components/
│   ├── editor-form.tsx           # 'use client' — shared EditorForm for /new and /entries/[id]/edit
│   ├── editor-tag-chip.tsx       # TagChip extended with onRemove × button (editor-only)
│   ├── delete-button.tsx         # 'use client' — AlertDialog trigger + modal
│   └── ui/
│       └── alert-dialog.tsx      # Generated by npx shadcn@latest add alert-dialog
└── lib/
    └── actions.ts                # Extended with createEntry, updateEntry, deleteEntry, setEntryTags
```

### Pattern 1: @uiw/react-md-editor Dynamic Import

The editor MUST be imported with `dynamic()` and `ssr: false` — it uses browser APIs that fail in SSR. Both the editor CSS files must be imported in the Client Component (or in globals.css).

```typescript
// src/components/editor-form.tsx
'use client';

import dynamic from 'next/dynamic';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
);

// Usage — data-color-mode prevents the editor defaulting to system dark mode
<div data-color-mode="light">
  <MDEditor
    value={body}
    onChange={(val) => setBody(val ?? '')}
    height={500}
  />
</div>
```

**Source:** [CITED: github.com/uiwjs/react-md-editor/issues/446] + [ASSUMED] training knowledge on dynamic import pattern.

**Why `data-color-mode="light"`:** The editor reads this attribute to set its internal color mode. Without it, the editor defaults to the system `prefers-color-scheme`. Since the project is light-mode only (dark mode is out of scope per REQUIREMENTS.md), force `"light"` to prevent the editor appearing dark on macOS dark-mode systems.

### Pattern 2: Drizzle Insert Returning ID

For the "create on first autosave" pattern, `createEntry` must return the new entry's `id` so the Client Component can redirect.

```typescript
// src/lib/actions.ts — createEntry
'use server';

export async function createEntry(title: string, body: string): Promise<{ id: number }> {
  const result = db
    .insert(entries)
    .values({ title, body })
    .returning({ id: entries.id })
    .all();          // .all() executes synchronously with better-sqlite3
  revalidatePath('/');
  return { id: result[0].id };
}
```

**Source:** [CITED: orm.drizzle.team/docs/insert] — `.returning()` + `.all()` is the correct synchronous execution path with better-sqlite3. [VERIFIED: npm registry for drizzle-orm]

### Pattern 3: updateEntry + setEntryTags

```typescript
// src/lib/actions.ts — updateEntry
export async function updateEntry(id: number, title: string, body: string): Promise<void> {
  db.update(entries)
    .set({ title, body, updatedAt: new Date() })
    .where(eq(entries.id, id))
    .run();
  revalidatePath('/');
  revalidatePath(`/entries/${id}`);
}

// src/lib/actions.ts — setEntryTags (replace-all strategy)
export async function setEntryTags(entryId: number, tagNames: string[]): Promise<void> {
  // Normalize server-side (guard against un-normalized client input)
  const normalized = [...new Set(
    tagNames.map(t => t.trim().toLowerCase()).filter(Boolean)
  )];

  // Delete all existing entry_tags for this entry
  db.delete(entryTags).where(eq(entryTags.entryId, entryId)).run();

  // Upsert each tag name, get/create tag ID, insert entry_tag
  for (const name of normalized) {
    // Insert tag if not exists (UNIQUE constraint on tags.name)
    db.insert(tags).values({ name }).onConflictDoNothing().run();
    const tag = db.select().from(tags).where(eq(tags.name, name)).all()[0];
    db.insert(entryTags).values({ entryId, tagId: tag.id }).onConflictDoNothing().run();
  }

  revalidatePath('/');
  revalidatePath(`/entries/${entryId}`);
}
```

**Note on `onConflictDoNothing`:** The `tags` table has `UNIQUE` on `name`. `onConflictDoNothing()` is the correct Drizzle idiom for upsert-or-skip. [ASSUMED] — Drizzle API known from training; verify with `drizzle-orm` docs if unsure.

### Pattern 4: deleteEntry

```typescript
// src/lib/actions.ts — deleteEntry
export async function deleteEntry(id: number): Promise<void> {
  // entry_tags rows cascade-delete due to FK ON DELETE CASCADE
  db.delete(entries).where(eq(entries.id, id)).run();
  revalidatePath('/');
}
```

**Note:** `entry_tags` has `ON DELETE CASCADE` on `entry_id` (confirmed in `db/index.ts` schema). Deleting the entry automatically removes its `entry_tags` rows. No manual junction cleanup needed.

### Pattern 5: Autosave Debounce in Client Component

```typescript
// src/components/editor-form.tsx (excerpt)
'use client';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEntry, updateEntry, setEntryTags } from '@/lib/actions';

type SaveStatus = 'idle' | 'saving' | 'saved';

export default function EditorForm({ initialEntry }: { initialEntry?: EntryDetail }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialEntry?.title ?? '');
  const [body, setBody] = useState(initialEntry?.body ?? '');
  const [chipTags, setChipTags] = useState<string[]>(initialEntry?.tags ?? []);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Track whether a DB record has been created yet (new entry only)
  const entryIdRef = useRef<number | null>(initialEntry?.id ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutosave = useCallback((t: string, b: string, tags: string[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // Skip save if both title and body are empty (avoid orphan records)
      if (!t.trim() && !b.trim()) return;

      setSaveStatus('saving');
      try {
        if (entryIdRef.current === null) {
          // First save — create record and redirect to edit URL
          const { id } = await createEntry(t, b);
          entryIdRef.current = id;
          await setEntryTags(id, tags);
          router.replace(`/entries/${id}/edit`);
        } else {
          await updateEntry(entryIdRef.current, t, b);
          await setEntryTags(entryIdRef.current, tags);
        }
        setSaveStatus('saved');
        // Fade out after 2500ms
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch {
        setSaveStatus('idle');
      }
    }, 500);
  }, [router]);

  // Call triggerAutosave from onChange handlers on title, body, and tag changes
}
```

**Source:** [ASSUMED] — standard React useRef debounce pattern; confirmed compatible with Next.js App Router Client Components.

### Pattern 6: First-Save Redirect — Return ID, Not `redirect()`

**Do NOT** call `redirect()` from `createEntry`. The `redirect()` function inside a Server Action throws `NEXT_REDIRECT` and terminates the action — the Client Component cannot catch the returned ID. Instead:

1. `createEntry` returns `{ id: number }` to the caller
2. Client Component receives it, updates `entryIdRef.current`, then calls `router.replace()`

This is the recommended pattern per Next.js docs for event-handler-driven navigation from Client Components. [CITED: nextjs.org/docs/app/api-reference/functions/redirect]

### Pattern 7: shadcn/ui AlertDialog Bootstrap

`components.json` does not exist. When you run `npx shadcn@latest add alert-dialog`, the CLI will detect the missing config and prompt:

```
You need to create a components.json file to add components. Proceed? (Y/n)
```

Answer **Y**. The CLI will:
1. Create `components.json` with auto-detected Next.js + Tailwind settings
2. Install `@radix-ui/react-alert-dialog`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
3. Create `src/components/ui/alert-dialog.tsx`
4. Create `src/lib/utils.ts` (the `cn()` helper — `clsx` + `tailwind-merge`)

Verify `src/components/ui/alert-dialog.tsx` exists before planning tasks that reference it. [CITED: ui.shadcn.com/docs/cli]

### Anti-Patterns to Avoid

- **Calling `redirect()` inside an autosave Server Action:** Throws `NEXT_REDIRECT`; Client Component cannot receive the returned ID. Return the ID instead; navigate client-side.
- **Creating a DB record on page load (`/new` mount):** Produces orphan empty records if user navigates away without typing. Gate creation on first keystroke content (D-03).
- **Calling `redirect()` in a try/catch block:** `redirect()` throws — the catch swallows it. If you ever use `redirect()` in Server Actions, call it outside try/catch.
- **Co-locating DB calls in Client Components:** All DB access goes through `'use server'` actions. Never import `db` directly into a Client Component (tree-shaking may fail; exposes internals).
- **Missing `data-color-mode` on MDEditor wrapper:** On macOS dark mode, the editor renders with dark background even though the page is light — jarring visual mismatch.
- **Importing MDEditor CSS in `globals.css` with `@import` before `@import "tailwindcss"`:** Tailwind v4's `@import "tailwindcss"` must be first. Place MDEditor CSS imports inside the Client Component file, not globals.css.
- **Forgetting `revalidatePath` on both `/` and `/entries/[id]`:** After update/delete, both the home list and the detail page are stale. Call `revalidatePath('/')` and `revalidatePath('/entries/${id}')`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown editor with preview | Custom textarea + remark render loop | `@uiw/react-md-editor` | SSR pitfalls, CodeMirror integration, split-pane sync — hundreds of edge cases |
| Delete confirmation modal | Custom `<dialog>` or `<div>` overlay | shadcn/ui AlertDialog (Radix UI) | Focus trap, Escape key, portal rendering, a11y roles — all handled |
| Class merging utility | Manual string concat or custom fn | `clsx` + `tailwind-merge` (`cn()`) | Tailwind class deduplication is non-trivial (e.g., `bg-red-500 bg-blue-500` must resolve) |
| Debounce function | Manual `setTimeout` in component body | `useRef` + `useCallback` pattern | Raw setTimeout in render body creates new timers on every render; ref pattern is the React-idiomatic solution |

**Key insight:** The editor and dialog are the two hardest UI problems in this phase — both have robust library solutions that handle accessibility and browser edge cases the hand-rolled versions would miss.

---

## Common Pitfalls

### Pitfall 1: MDEditor CSS Bleed into Tailwind Preflight

**What goes wrong:** `@uiw/react-md-editor`'s bundled CSS resets some element styles. Tailwind v4's preflight (`@import "tailwindcss"`) also resets elements. When both run, the order determines which wins. If MDEditor CSS is imported globally, it may conflict with Tailwind prose styles on the detail page.

**Why it happens:** MDEditor's `markdown-editor.css` targets semantic HTML elements (h1, h2, p, code) with opinionated styles. Tailwind's preflight zeroes these out. The conflict depends on CSS load order.

**How to avoid:** Import MDEditor CSS only inside the Client Component file (`editor-form.tsx`), not in `globals.css`. This scopes the import to the dynamic chunk and keeps globals.css clean. Verify the detail page (`/entries/[id]`) still renders correctly after Phase 3 changes.

**Warning signs:** Heading sizes in the read-only detail page change after installing MDEditor. Code block padding shifts on the home page snippet.

### Pitfall 2: Race Condition Between First Autosave and Subsequent Keystrokes

**What goes wrong:** User types quickly. First autosave fires (`createEntry` in flight). Before it returns, another autosave timer fires and calls `updateEntry(null, ...)` because `entryIdRef.current` is still `null` — NaN or null passed to WHERE clause, silent no-op or error.

**Why it happens:** `entryIdRef.current` is not set until the first `createEntry` promise resolves. If the user keeps typing, the debounce fires again while the first call is in flight.

**How to avoid:** Use a second ref `const isSavingRef = useRef(false)` to skip concurrent saves. If `isSavingRef.current === true`, skip the debounce callback. Set it `true` before the await, `false` in the finally block.

**Warning signs:** Console errors for NaN entry IDs; duplicate entries in the DB; autosave status stuck on "Saving...".

### Pitfall 3: Orphan Records from Empty-Title Page Load

**What goes wrong:** Creating a DB record immediately on `/new` mount (not waiting for first keystroke) means navigation away before typing leaves an empty `{ title: '', body: '' }` entry in the database.

**Why it happens:** If `createEntry` is called in a `useEffect` on mount, every `/new` visit creates a record.

**How to avoid:** Gate `createEntry` on the content check: `if (!t.trim() && !b.trim()) return;` inside the debounce callback (D-03 — confirmed in locked decisions).

**Warning signs:** Empty entries appearing in the home page list; entry count grows without user writing anything.

### Pitfall 4: shadcn `cn()` Utility Missing

**What goes wrong:** `alert-dialog.tsx` imports `cn` from `@/lib/utils`. If `src/lib/utils.ts` doesn't exist, TypeScript errors immediately.

**Why it happens:** shadcn CLI creates `src/lib/utils.ts` during `npx shadcn@latest add` — but only if you complete the init flow. If the init is aborted or the file is already present with a different shape, it may not create the `cn` export.

**How to avoid:** After running `npx shadcn@latest add alert-dialog`, verify both `src/components/ui/alert-dialog.tsx` AND `src/lib/utils.ts` exist. If `utils.ts` is missing, create it:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { tailwind-merge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Warning signs:** TypeScript error `Cannot find module '@/lib/utils'` in alert-dialog.tsx.

### Pitfall 5: `setEntryTags` Called Separately Creates Two Autosaves

**What goes wrong:** `updateEntry` and `setEntryTags` are called sequentially in the autosave callback — two separate network round trips. If a tag change triggers autosave while an update is in flight, the tag write races the entry write.

**Why it happens:** Separate Server Actions for content and tags.

**How to avoid:** Either (a) call them sequentially with `await` and accept the double round-trip, or (b) combine them into a single `saveEntry(id, title, body, tags)` Server Action that runs both operations in the same synchronous block (no transaction needed since better-sqlite3 is single-connection). Option (b) is simpler and faster. Recommendation: use a single `saveEntry` action.

**Warning signs:** Tags saved correctly but body missing after rapid typing (or vice versa); autosave status flickering between "Saving..." calls.

### Pitfall 6: `router.replace()` Called Multiple Times on Fast Typing

**What goes wrong:** User types fast, multiple 500ms debounce timers fire before `createEntry` returns. Each timer checks `entryIdRef.current === null` and calls `createEntry`, producing multiple DB records and multiple `router.replace()` calls.

**Why it happens:** The debounce clears the previous timer but if the first save is still in-flight, a new timer fires after another 500ms.

**How to avoid:** Set `entryIdRef.current` to a sentinel value (e.g., `-1` = "save in progress") before the `createEntry` await. Only call `createEntry` if `entryIdRef.current === null`. On success, set to the real `id`. Reset to `null` only on error.

**Warning signs:** Multiple entries appear with same content; browser history shows multiple redirects.

---

## Code Examples

### EditorTagChip (editor-only variant of TagChip)

```typescript
// src/components/editor-tag-chip.tsx
interface Props {
  name: string;
  onRemove: () => void;
}

export default function EditorTagChip({ name, onRemove }: Props) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal bg-zinc-100 text-zinc-600">
      {name}
      <button
        type="button"
        onClick={onRemove}
        className="ml-1.5 p-1 -m-1 text-zinc-400 hover:text-zinc-700 cursor-pointer leading-none"
        aria-label={`Remove tag ${name}`}
      >
        ×
      </button>
    </span>
  );
}
```

### Tag Normalization (client-side, on chip creation)

```typescript
function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

function addTag(raw: string) {
  const normalized = normalizeTag(raw);
  if (!normalized) return;                              // empty after trim
  if (chipTags.includes(normalized)) return;           // duplicate
  setChipTags(prev => [...prev, normalized]);
  setTagInput('');
  triggerAutosave(title, body, [...chipTags, normalized]);
}
```

### AlertDialog Usage

```typescript
// src/components/delete-button.tsx
'use client';
import { useRouter } from 'next/navigation';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteEntry } from '@/lib/actions';

export default function DeleteButton({ entryId }: { entryId: number }) {
  const router = useRouter();

  async function handleDelete() {
    await deleteEntry(entryId);
    router.replace('/');
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="px-3 py-1.5 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50">
          Delete
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The entry will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete entry
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Source:** [CITED: ui.shadcn.com/docs/components/radix/alert-dialog]

### Autosave Status Label

```typescript
// Inside EditorForm — status label with fade
<div className="flex items-center justify-between mb-4">
  <Link href={backHref} className="text-sm text-zinc-500 hover:text-zinc-800">
    {backLabel}
  </Link>
  <span
    className={`text-xs transition-opacity duration-500 ${
      saveStatus === 'idle' ? 'opacity-0 text-zinc-300' : 'opacity-100 text-zinc-500'
    }`}
  >
    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved just now' : ' '}
  </span>
</div>
```

**Note:** Use ` ` (non-breaking space) for idle state text to prevent layout shift — element stays in DOM with height but is invisible (`opacity-0`).

---

## Project Constraints (from CLAUDE.md)

| Directive | Applies To Phase 3 |
|-----------|-------------------|
| Tech stack: Next.js + SQLite only | Yes — no new persistence layers |
| `better-sqlite3` + Drizzle ORM for all DB | Yes — all mutations via these |
| `@uiw/react-md-editor` for the editor | Yes — locked; dynamic import with ssr:false |
| Server Actions (not API Routes) for mutations | Yes — `createEntry`, `updateEntry`, `deleteEntry`, `setEntryTags` in actions.ts |
| `revalidatePath` after every mutation | Yes — call after create, update, delete, setTags |
| shadcn/ui + Tailwind for UI | Yes — AlertDialog from shadcn; all styling in Tailwind |
| No `'use client'` at page level | Yes — `/new` and `/entries/[id]/edit` pages are Server Components; EditorForm is a Client Component child |
| No Edge runtime | Yes — `better-sqlite3` requires Node.js runtime; never set `runtime = 'edge'` |
| `max-w-5xl mx-auto` layout width | Yes — all pages including editor pages use this |
| `react-markdown` for read views | Yes — detail page unchanged; MDEditor for write |
| localhost only / no auth | Yes — no auth, no deployment config needed |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `db.insert(...).returning().get()` | `db.insert(...).returning().all()[0]` | `.get()` deprecated in newer Drizzle; `.all()` is canonical for synchronous execution |
| Manual `setTimeout` state in component body | `useRef` for timer handle to avoid closure capture issues | Prevents memory leaks and stale-closure bugs |
| `redirect()` from Server Action for post-create navigation | Return `{ id }` from Server Action; `router.replace()` client-side | `redirect()` in Server Action is for full-page navigations, not fire-and-forget autosave flows |
| `npx shadcn-ui@latest` (old CLI name) | `npx shadcn@latest` (current CLI) | Package was renamed; `shadcn-ui` is deprecated |

**Deprecated/outdated:**
- `shadcn-ui` package name: replaced by `shadcn`. Always use `npx shadcn@latest`, not `npx shadcn-ui@latest`. [ASSUMED]
- `.get()` on Drizzle queries: use `.all()[0]` for synchronous single-row fetch. [ASSUMED — verify against current drizzle-orm docs]

---

## Validation Architecture

> `workflow.nyquist_validation: true` in config.json — section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected (no pytest.ini, jest.config.*, vitest.config.*, no test/ directory) |
| Config file | None — Wave 0 must create |
| Quick run command | `npx vitest run --reporter=verbose` (after Wave 0 setup) |
| Full suite command | `npx vitest run` |

**Recommended framework:** Vitest — compatible with Next.js App Router, TypeScript-native, minimal config. [ASSUMED]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TAG-02 | `normalizeTag()` trims, lowercases, deduplicates, removes empties | unit | `npx vitest run tests/tag-normalize.test.ts` | ❌ Wave 0 |
| ENTR-01 | `createEntry` inserts row and returns `{ id: number }` | unit (with SQLite in-memory) | `npx vitest run tests/actions.test.ts` | ❌ Wave 0 |
| ENTR-02 | `updateEntry` modifies existing row | unit (with SQLite in-memory) | `npx vitest run tests/actions.test.ts` | ❌ Wave 0 |
| ENTR-03 | `deleteEntry` removes row + cascades entry_tags | unit (with SQLite in-memory) | `npx vitest run tests/actions.test.ts` | ❌ Wave 0 |
| ENTR-04 | Autosave debounce: fires after 500ms, not on every keystroke | manual | — | manual-only |
| TAG-01 | Tag chip creation on Enter/comma | manual | — | manual-only |
| ENTR-01/02/04 | Editor renders without SSR crash | smoke | `npm run build` | manual-verify |

**Manual-only justifications:**
- ENTR-04 (autosave feel): debounce timing is a UX judgment, not a logic assertion; automated tests on setTimeout behavior are brittle.
- TAG-01 (chip creation): requires DOM interaction with the MDEditor and tag input; E2E testing not in scope for v1.

### Sampling Rate

- **Per task commit:** `npx vitest run tests/tag-normalize.test.ts` (fast, pure logic)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green + manual smoke test of editor in browser before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/tag-normalize.test.ts` — unit tests for tag normalization logic (REQ TAG-02)
- [ ] `tests/actions.test.ts` — unit tests for createEntry, updateEntry, deleteEntry with in-memory SQLite (REQ ENTR-01, ENTR-02, ENTR-03)
- [ ] `vitest.config.ts` — Vitest configuration file
- [ ] Framework install: `npm install -D vitest` — if Vitest is chosen

---

## Security Domain

> `security_enforcement` not set to `false` in config — section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user local app, no auth |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No users to restrict |
| V5 Input Validation | yes | Tag normalization (server-side guard in `setEntryTags`); title/body length limits optional |
| V6 Cryptography | no | No secrets, no passwords |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via Markdown body | Spoofing/Tampering | `react-markdown` renders to React elements (no `dangerouslySetInnerHTML`); safe by default |
| Tag injection (e.g., SQL via tag name) | Tampering | Drizzle parameterized queries — tag names are bound parameters, not interpolated SQL |
| Orphan empty entries | Denial of data quality | Gate `createEntry` on non-empty content (D-03) |
| FTS5 index drift | Tampering | Handled by existing triggers; no new FTS work in Phase 3 |

**Note:** This is a single-user local app. XSS is the only practically relevant threat (imported markdown files could contain scripts). `react-markdown`'s default behavior mitigates this. [ASSUMED]

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js / better-sqlite3 | ✓ | (confirmed — project runs) | — |
| npm | Package installs | ✓ | (confirmed) | — |
| npx | shadcn CLI bootstrap | ✓ | (confirmed — npm ships npx) | — |
| SQLite (via better-sqlite3) | DB layer | ✓ | confirmed in Phase 1 | — |

No missing dependencies with no fallback. Phase 3 has no new external runtime dependencies beyond npm-installable packages.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `.returning().all()[0]` is correct Drizzle API for synchronous insert-returning-id | Standard Stack / Pattern 2 | Insert returns wrong shape; `id` undefined; runtime error on first save |
| A2 | `onConflictDoNothing()` is the Drizzle idiom for upsert-or-skip on UNIQUE constraint | Pattern 3 (setEntryTags) | Tag insert throws on duplicate instead of skipping; autosave errors on any repeated tag |
| A3 | shadcn CLI prompts to create `components.json` if absent (does not hard-fail) | Pattern 7 | CLI errors out; AlertDialog install fails; manual init required |
| A4 | `data-color-mode="light"` on MDEditor wrapper forces light mode regardless of system preference | Pattern 1 | Editor renders dark on macOS dark-mode systems; visual mismatch |
| A5 | `'use client'` in `editor-form.tsx` importing a `'use server'` action via direct import is valid in Next.js App Router | Pattern 5 | Build error; must use different invocation pattern |
| A6 | Vitest is compatible with this Next.js 16 + TypeScript setup without additional config | Validation Architecture | Test runner fails to parse Next.js-specific imports; different test framework needed |
| A7 | `npx shadcn@latest` (not `shadcn-ui@latest`) is the current CLI name | Standard Stack | Wrong package installed; init fails |

---

## Open Questions (RESOLVED)

1. **`setEntryTags` vs combined `saveEntry` action**
   - What we know: Two sequential Server Actions (update + setTags) work but add latency and complexity
   - What's unclear: Whether the planner should merge into a single `saveEntry(id, title, body, tags)` action
   - Recommendation: Planner should decide — merged action is simpler and reduces round-trips; research supports either approach
   - (RESOLVED: separate updateEntry + setEntryTags, called sequentially with await in EditorForm)

2. **Vitest vs no testing framework**
   - What we know: No test framework exists in the project; `nyquist_validation: true` requires one
   - What's unclear: User may prefer to skip unit tests for v1 given the personal-tool context
   - Recommendation: Create Vitest setup in Wave 0 for tag normalization tests (pure logic, high value, fast) — skip integration tests for Server Actions if setup cost is too high
   - (RESOLVED: Vitest installed in Wave 0, vitest.config.ts + test stubs in 03-01)

3. **MDEditor CSS import location**
   - What we know: Importing in Client Component file scopes to dynamic chunk; importing in globals.css applies globally
   - What's unclear: Whether globals.css import causes actual conflicts with Phase 2 prose styles
   - Recommendation: Import in Client Component file to be safe; validate detail page still looks correct
   - (RESOLVED: import in editor-form.tsx Client Component, not globals.css)

---

## Sources

### Primary (HIGH confidence)
- npm registry (2026-05-25) — all package versions verified via `npm view`
- `src/lib/db/index.ts`, `src/lib/db/schema.ts`, `src/lib/actions.ts` — existing codebase patterns (READ directly)
- `src/components/tag-chip.tsx`, `src/components/app-header.tsx`, `src/app/entries/[id]/page.tsx` — existing component patterns (READ directly)
- `package.json`, `next.config.ts`, `src/app/globals.css` — current project config (READ directly)
- `.planning/phases/03-write-loop/03-CONTEXT.md` — locked decisions D-01 through D-13
- `.planning/phases/03-write-loop/03-UI-SPEC.md` — complete visual + interaction contract
- [CITED: ui.shadcn.com/docs/cli] — shadcn CLI init and add behavior
- [CITED: ui.shadcn.com/docs/components/radix/alert-dialog] — AlertDialog component API
- [CITED: nextjs.org/docs/app/api-reference/functions/redirect] — redirect() behavior in Server Actions

### Secondary (MEDIUM confidence)
- [CITED: github.com/uiwjs/react-md-editor/issues/446] — Next.js dynamic import pattern with ssr:false
- WebSearch results on Drizzle `.returning().all()` pattern — cross-referenced with orm.drizzle.team/docs/insert

### Tertiary (LOW confidence)
- Training knowledge on React `useRef` debounce pattern, `onConflictDoNothing`, Drizzle update syntax — flagged as [ASSUMED] in Assumptions Log

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified on npm registry; no new runtime services
- Architecture: HIGH — patterns derived directly from existing Phase 1/2 codebase + locked decisions
- Pitfalls: MEDIUM — most derived from reasoning about known Next.js + Drizzle + MDEditor behaviors; some [ASSUMED]
- Validation architecture: MEDIUM — test framework recommendation is [ASSUMED]; no existing test infra to build on

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (30 days — stack is stable; MDEditor and shadcn CLI are the most likely to change)
