---
phase: 03-write-loop
fixed_at: 2026-05-26T08:05:00Z
review_path: .planning/phases/03-write-loop/03-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-05-26T08:05:00Z
**Source review:** .planning/phases/03-write-loop/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (CR-01, CR-02, CR-03, WR-01, WR-02, WR-03, WR-04, WR-05)
- Fixed: 8
- Skipped: 0

---

## Fixed Issues

### CR-01: setEntryTags multi-step mutation wrapped in transaction

**Files modified:** `src/lib/actions.ts`
**Commit:** d5b655e
**Applied fix:** Replaced the bare Drizzle delete + insert loop with a `db.$client.transaction()` wrapper using raw `better-sqlite3` prepare/run calls. The DELETE and all INSERT statements for tags and entry_tags now execute atomically. Added a guard to throw if the tag row is not found after upsert.

---

### CR-02: isSavingRef guard moved inside debounce callback with re-schedule

**Files modified:** `src/components/editor-form.tsx`
**Commit:** 28b4f34
**Applied fix:** Removed the early-return `if (isSavingRef.current) return` that was outside the `setTimeout`. The check now lives inside the debounce callback and re-calls `triggerAutosave(t, b, tags)` to re-schedule rather than silently dropping keystrokes typed during an in-flight save.

---

### CR-03: createEntry result bounds check added

**Files modified:** `src/lib/actions.ts`
**Commit:** d5b655e
**Applied fix:** Added `if (result.length === 0) throw new Error('createEntry: insert returned no rows')` immediately after `.returning().all()` so unexpected empty results throw a clear error instead of a cryptic `TypeError` on `result[0].id`.

---

### WR-01: deleteEntry now invalidates entry and edit page caches

**Files modified:** `src/lib/actions.ts`
**Commit:** d5b655e
**Applied fix:** Added `revalidatePath('/entries/${id}')` and `revalidatePath('/entries/${id}/edit')` after the delete so Next.js full-route cache and prefetch cache for both the detail and edit pages are invalidated on deletion.

---

### WR-02: Timer leak on unmount fixed with useEffect cleanup

**Files modified:** `src/components/editor-form.tsx`
**Commit:** 28b4f34
**Applied fix:** Added a `useEffect(() => { return () => { clearTimeout(debounceRef); clearTimeout(fadeTimerRef); }; }, [])` cleanup that fires on unmount. Prevents `setSaveStatus` calls and Server Action invocations on dead component instances after router navigation.

---

### WR-03: entryTags Drizzle schema now declares composite primaryKey

**Files modified:** `src/lib/db/schema.ts`
**Commit:** 1821719
**Applied fix:** Added `primaryKey` to the `drizzle-orm/sqlite-core` import and added a table-level `pk: primaryKey({ columns: [table.entryId, table.tagId] })` option to `entryTags`. The Drizzle schema now matches the `PRIMARY KEY (entry_id, tag_id)` constraint declared in the raw SQL `initSchema()` call, ensuring drizzle-kit generated migrations stay correct.

---

### WR-04: formatEntryDate guards against negative diffDays

**Files modified:** `src/lib/utils/format.ts`
**Commit:** ebaab9c
**Applied fix:** Added `if (diffDays < 0) return \`${absolute}\`;` before the `diffDays === 0` check. Future-dated timestamps (clock skew or ms/s unit mismatch) now display the absolute date string only instead of "-1 days ago — ...".

---

### WR-05: Orphan guard scoped to new-entry mode only

**Files modified:** `src/components/editor-form.tsx`
**Commit:** 28b4f34
**Applied fix:** Changed `if (!t.trim() && !b.trim()) return` to `if (entryIdRef.current === null && !t.trim() && !b.trim()) return`. The guard now only prevents creating an empty orphan entry on first save; on edit mode (where `entryIdRef.current` is already set) a save with cleared fields will correctly overwrite the server-side content.

---

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-05-26T08:05:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
