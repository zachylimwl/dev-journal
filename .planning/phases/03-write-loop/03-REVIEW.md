---
phase: 03-write-loop
reviewed: 2026-05-26T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - vitest.config.ts
  - tests/tag-normalize.test.ts
  - tests/actions.test.ts
  - src/lib/actions.ts
  - src/components/app-header.tsx
  - src/components/editor-tag-chip.tsx
  - src/components/editor-form.tsx
  - src/app/new/page.tsx
  - src/app/entries/[id]/edit/page.tsx
  - src/components/delete-button.tsx
  - src/app/entries/[id]/page.tsx
findings:
  critical: 3
  warning: 5
  info: 2
  total: 10
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Reviewed the Phase 3 write-loop implementation: autosave editor form, server actions (create/update/delete/tag), tag normalization, and associated tests. The overall structure is sound and follows the project's conventions (Server Actions, Drizzle ORM, `better-sqlite3`, client-component autosave). Three blockers were found: a non-atomic multi-step tag mutation that can corrupt data on failure, a silent data loss window in the autosave race guard, and an unguarded array access that throws at runtime when the DB returns no rows. Five warnings cover a missing cache invalidation, a timer leak on unmount, a schema/SQL mismatch, a negative-days display bug, and the orphan-guard skipping saves when only body has content on edit. Two info items are noted.

---

## Critical Issues

### CR-01: `setEntryTags` multi-step mutation is not wrapped in a transaction

**File:** `src/lib/actions.ts:118-128`
**Issue:** `setEntryTags` executes a `DELETE` followed by a loop of `INSERT` statements against `entryTags` and `tags`. These are separate synchronous calls with no enclosing transaction. If any insert in the loop throws (e.g., a constraint violation that `onConflictDoNothing` does not cover, a DB lock error, or an out-of-disk error), the entry is left with zero tags — all old tags were already deleted and the new ones are partially written. This is a data-integrity bug: a network/process interruption after the `DELETE` but before the loop completes silently erases all tag associations.

**Fix:** Wrap the entire replace-all sequence in a `better-sqlite3` transaction:
```typescript
export async function setEntryTags(entryId: number, tagNames: string[]): Promise<void> {
  const normalized = [...new Set(tagNames.map(t => t.trim().toLowerCase()).filter(Boolean))];

  const replaceAll = db.$client.transaction(() => {
    db.$client.prepare('DELETE FROM entry_tags WHERE entry_id = ?').run(entryId);
    for (const name of normalized) {
      db.$client.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
      const tag = db.$client.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: number };
      db.$client.prepare('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)').run(entryId, tag.id);
    }
  });
  replaceAll();

  revalidatePath('/');
  revalidatePath(`/entries/${entryId}`);
}
```
Alternatively, keep Drizzle calls but use `db.$client.transaction(fn)` to wrap the Drizzle operations, since `better-sqlite3` transactions are synchronous and fully compatible.

---

### CR-02: `isSavingRef` guard silently drops keystrokes typed during an in-flight save

**File:** `src/components/editor-form.tsx:42-43`
**Issue:** When `isSavingRef.current` is `true`, `triggerAutosave` returns immediately without even starting the debounce timer. Any keystrokes typed while a save is in flight produce no pending debounce. When the save completes and `isSavingRef.current` is reset to `false` (line 69), those intermediate changes are silently abandoned — they will never be autosaved unless the user types again. In a 500 ms debounce + variable network/IO save time scenario, this window is wide enough to lose real content.

**Fix:** Instead of returning early, always (re)start the debounce timer; let the check happen inside the callback just before the actual save:
```typescript
const triggerAutosave = useCallback(
  (t: string, b: string, tags: string[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!t.trim() && !b.trim()) return;
      if (isSavingRef.current) {
        // Re-schedule once the current save finishes instead of dropping
        triggerAutosave(t, b, tags);
        return;
      }
      isSavingRef.current = true;
      setSaveStatus('saving');
      try {
        // ... existing save logic
      } finally {
        isSavingRef.current = false;
      }
    }, 500);
  },
  [router],
);
```

---

### CR-03: `createEntry` result accessed at index 0 without bounds check

**File:** `src/lib/actions.ts:101`
**Issue:** `result[0].id` is accessed unconditionally after `.returning().all()`. If the insert does not return a row (which `better-sqlite3` would not do silently under normal conditions, but could happen under unusual driver or schema mismatch circumstances), this throws `TypeError: Cannot read properties of undefined (reading 'id')`, surfacing as an unhandled 500 to the user with no meaningful message. The same pattern is used in `setEntryTags` line 123: `const tag = db.select()...all()[0]` — `tag` can be `undefined` if `onConflictDoNothing` absorbs the insert and the name does not already exist in tags (impossible under correct logic, but fragile).

**Fix for `createEntry`:**
```typescript
const result = db.insert(entries).values({ title, body }).returning({ id: entries.id }).all();
if (result.length === 0) throw new Error('createEntry: insert returned no rows');
return { id: result[0].id };
```

**Fix for `setEntryTags` tag lookup (also addresses CR-01 when using Drizzle):**
```typescript
const tagRow = db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).all()[0];
if (!tagRow) throw new Error(`setEntryTags: tag "${name}" not found after upsert`);
db.insert(entryTags).values({ entryId, tagId: tagRow.id }).onConflictDoNothing().run();
```

---

## Warnings

### WR-01: `deleteEntry` does not invalidate the entry's own cached page

**File:** `src/lib/actions.ts:113-116`
**Issue:** After deleting an entry, `revalidatePath('/')` is called but `revalidatePath('/entries/${id}')` is not. If Next.js has a cached render of `/entries/${id}` (e.g., full-route cache or prefetch cache), a user navigating directly to that URL after deletion may be served a stale "entry found" page instead of a 404. The edit page (`/entries/${id}/edit`) is similarly not invalidated.

**Fix:**
```typescript
export async function deleteEntry(id: number): Promise<void> {
  db.delete(entries).where(eq(entries.id, id)).run();
  revalidatePath('/');
  revalidatePath(`/entries/${id}`);
  revalidatePath(`/entries/${id}/edit`);
}
```

---

### WR-02: Timer leak — `debounceRef` and `fadeTimerRef` not cleared on unmount

**File:** `src/components/editor-form.tsx:37-38, 63-64`
**Issue:** Both `debounceRef` and `fadeTimerRef` are set via `setTimeout` but there is no `useEffect` cleanup that clears them when the component unmounts. After `router.replace('/entries/${id}/edit')` (line 56), the new-entry form may unmount while the `fadeTimerRef` callback (`setSaveStatus('idle')`, line 64) is still pending. Calling `setSaveStatus` on an unmounted component triggers a React warning in development and is a logic error. Similarly, an in-flight `debounceRef` timer fires after unmount and invokes async Server Actions on a dead component instance.

**Fix:** Add a cleanup effect:
```typescript
useEffect(() => {
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
  };
}, []);
```

---

### WR-03: Drizzle schema for `entryTags` missing composite primary key — schema diverges from SQL

**File:** `src/lib/db/schema.ts:26-29`
**Issue:** The raw SQL in `db/index.ts` (line 33) defines `PRIMARY KEY (entry_id, tag_id)` on `entry_tags`. The Drizzle schema definition for `entryTags` does not declare a `primaryKey()` constraint. This means:
1. Drizzle's TypeScript layer has no uniqueness constraint on the pair, so ORM-generated migrations (if ever run via `drizzle-kit`) would create the table without the composite PK, diverging from the intended schema.
2. The `onConflictDoNothing()` call in `setEntryTags` relies on this PK to detect duplicate `(entry_id, tag_id)` pairs — without the ORM-level constraint this silently breaks if `drizzle-kit push` is ever used to create the schema.

**Fix:**
```typescript
import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';

export const entryTags = sqliteTable('entry_tags', {
  entryId: integer('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  tagId:   integer('tag_id').notNull().references(() => tags.id,    { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.entryId, table.tagId] }),
}));
```

---

### WR-04: `formatEntryDate` returns nonsense for future timestamps

**File:** `src/lib/utils/format.ts:28-32`
**Issue:** If `createdAt` is in the future relative to `now` (negative `diffMs`), `diffDays` is negative (e.g., `-1`). The function falls through to the default branch and returns `"-1 days ago — May 27, 2026"`, which is user-visible nonsense. This can occur due to clock skew, a misconfigured system clock, or a timestamp stored with the wrong unit. The `mode: 'timestamp'` Drizzle column stores seconds as an integer; passing a JavaScript `Date` to Drizzle causes it to store milliseconds-since-epoch divided by 1000 — a mismatch here would create far-future dates.

**Fix:**
```typescript
if (diffDays < 0) return `${absolute}`; // future date — show absolute only
if (diffDays === 0) return `Today — ${absolute}`;
if (diffDays === 1) return `Yesterday — ${absolute}`;
return `${diffDays} days ago — ${absolute}`;
```

---

### WR-05: Orphan guard in autosave skips saves on edit when body is the only content

**File:** `src/components/editor-form.tsx:46`
**Issue:** The orphan guard `if (!t.trim() && !b.trim()) return;` is evaluated inside the debounce for both `mode === 'new'` and `mode === 'edit'`. On the edit page, if the user clears both title and body fields, the save is skipped — but the previous server-side version of those fields is never overwritten. The user believes they cleared the entry but the DB still holds old content. This is a subtle data integrity issue: the UI shows empty fields but the saved entry is not empty.

**Fix:** The orphan guard should only apply when `entryIdRef.current === null` (i.e., on initial creation, before a DB record exists):
```typescript
// Only skip if no entry created yet (prevents creating empty orphan entries)
if (entryIdRef.current === null && !t.trim() && !b.trim()) return;
```

---

## Info

### IN-01: Tag normalization is duplicated between client and server with no shared source

**File:** `src/components/editor-form.tsx:78` and `src/lib/actions.ts:119`
**Issue:** `addTag()` in `EditorForm` normalizes via `raw.trim().toLowerCase()` (line 78), and `setEntryTags` independently normalizes via `t.trim().toLowerCase()` (line 119). There is a comment in `tag-normalize.test.ts` acknowledging this duplication. If normalization logic ever changes (e.g., adding slug-style hyphenation), it must be updated in two places. The test file itself also re-implements the function inline rather than importing from either source.

**Fix:** Extract `normalizeTag` to `src/lib/utils/tags.ts` and import it in both `editor-form.tsx` and `actions.ts`. Update `tests/tag-normalize.test.ts` to import the shared function.

---

### IN-02: `editor-tag-chip.tsx` comment incorrectly claims `'use client'` is not needed

**File:** `src/components/editor-tag-chip.tsx:3`
**Issue:** The comment "No 'use client' needed — no hooks. onRemove is passed as a prop from EditorForm" is technically accurate but potentially misleading. `onClick` is an event handler — if this component were ever imported into a Server Component directly (not via a `'use client'` parent), React would throw at runtime because event handlers cannot cross the server/client boundary. The comment may give a false impression that the component is universally safe to use without the directive.

**Fix:** Either add `'use client'` to make the boundary explicit and safe regardless of caller context, or amend the comment to note it is only safe when rendered from a Client Component parent.

---

_Reviewed: 2026-05-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
