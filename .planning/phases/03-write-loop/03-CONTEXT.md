# Phase 3: Write Loop - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers the write experience: create, edit, delete, and tag journal entries with autosave. After this phase the app is daily-usable — users can write new entries, edit existing ones without pressing Save, delete entries with confirmation, and manage project tags inline. Phase 2's read-only detail page remains; Phase 3 adds an Edit button and a separate editor route.

No search, filtering, or export — those are Phase 4+.

</domain>

<decisions>
## Implementation Decisions

### Editor Routing & Access Flow
- **D-01:** Entry cards on the home page continue to link to the read-only detail page (`/entries/[id]`) — Phase 2's detail page stays as-is. An **Edit button** on the detail page routes to `/entries/[id]/edit`.
- **D-02:** A **"New Entry" button** lives in the existing `AppHeader` component and routes to `/new`.
- **D-03:** The `/new` page creates a DB record on **first autosave** (when title or body is first typed) — not immediately on page load. This avoids orphan records.
- **D-04:** After the first autosave of a new entry, **redirect to `/entries/[id]/edit`** so the URL becomes bookmarkable and the editor continues at that route.

### Tag Input UX
- **D-05:** Existing tags render as **chip UI with × buttons** — reuses the `TagChip` component from Phase 2, keeping the tag display consistent across list, detail, and editor views.
- **D-06:** Adding a tag: **text input field; press Enter or type a comma** to create a new chip. Matches developer typing habits.
- **D-07:** Tag input zone is positioned **below the title, above the Markdown editor** — natural document structure: title → tags → body.
- **D-08:** Tags are normalized (trimmed, lowercased, deduplicated, empties removed) on chip creation and on save — locked by success criteria.

### Delete Confirmation
- **D-09:** Use a **shadcn/ui `AlertDialog` modal** for the confirmation prompt ("Delete entry?" + Cancel/Delete buttons). Consistent with the shadcn/ui component system already in the project.
- **D-10:** Delete is available on **both** the detail page (`/entries/[id]`) and the edit page (`/entries/[id]/edit`).
- **D-11:** After deletion, **redirect to the home page** (`/`).

### Autosave Status Indicator
- **D-12:** Display a **small status text label** positioned in the editor header area (top-right near title). Non-intrusive, always in-context.
- **D-13:** Three states: `"Saving..."` → `"Saved just now"` → **fades out** after a few seconds. Clean idle state (nothing visible when not writing).

### Claude's Discretion
- Editor layout within `/new` and `/entries/[id]/edit`: exact header/toolbar/padding structure beyond the title → tags → body ordering.
- Whether to use a shared editor component between `/new` and `/entries/[id]/edit` or two separate page files.
- Autosave fade-out duration (suggested: 2–3 seconds).
- Exact wording and destructive-button color in the AlertDialog.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — ENTR-01, ENTR-02, ENTR-03, ENTR-04 (entry CRUD), TAG-01, TAG-02 (tag management); all targeted by Phase 3
- `.planning/ROADMAP.md` §Phase 3 — Success criteria (5 items) and the `UI hint: yes` flag

### Stack Decisions (locked in Phase 1)
- `CLAUDE.md` §Markdown Editor — `@uiw/react-md-editor` is the chosen editor; dynamic import with `ssr: false` required
- `CLAUDE.md` §Database Layer — `better-sqlite3` + Drizzle ORM; synchronous API; no Prisma
- `CLAUDE.md` §Server Actions vs API Routes — mutations go in `'use server'` actions; call `revalidatePath` after writes

### Existing Phase 1 & 2 Code
- `src/lib/db/schema.ts` — `entries`, `tags`, `entryTags` table definitions + FTS5 virtual table
- `src/lib/db/index.ts` — DB singleton (globalThis pattern); auto-init on first import
- `src/lib/actions.ts` — `getEntries()` and `getEntryById()` patterns; Phase 3 adds `createEntry`, `updateEntry`, `deleteEntry`, `setEntryTags`
- `src/lib/utils/format.ts` — `generateSnippet`, `formatEntryDate` utilities
- `src/components/AppHeader.tsx` — global header; Phase 3 adds "New Entry" button here
- `src/components/TagChip.tsx` — reused for chip display in tag input zone
- `src/components/MarkdownBody.tsx` — reused on the read-only detail page (unchanged)
- `src/app/entries/[id]/page.tsx` — Phase 2 detail page; Phase 3 adds Edit + Delete buttons
- `src/app/layout.tsx` — root layout with Geist fonts; `min-h-full flex flex-col`

### External Library Docs (for Phase 3)
- `@uiw/react-md-editor` — dynamic import pattern: `dynamic(() => import('@uiw/react-md-editor'), { ssr: false })`
- shadcn/ui `AlertDialog` — needed for delete confirmation modal

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TagChip` component: already renders a tag with correct styling; Phase 3 wraps it with an `×` button in the editor's tag input zone
- `AppHeader`: slot for "New Entry" button already exists structurally; Phase 3 adds it
- `getEntries()` / `getEntryById()` Server Action patterns: Phase 3 follows same shape for `createEntry`, `updateEntry`, `deleteEntry`, `setEntryTags`
- `revalidatePath('/')` pattern from Phase 2: all mutations call this to refresh the home page list

### Established Patterns
- **Server Components for pages** — `page.tsx` files must remain Server Components (no `'use client'` at the page level)
- **Client Components for interactivity** — the editor (`/new` and `/entries/[id]/edit`) will be Client Components (`'use client'`) because `@uiw/react-md-editor` requires it
- **`'use server'` module for all DB operations** — mutations go in `actions.ts`; do not co-locate DB calls in Client Components
- **Drizzle query pattern** — `db.insert(entries).values({...}).returning().get()` for creates; `db.update(entries).set({...}).where(eq(entries.id, id)).run()` for updates
- **`max-w-5xl mx-auto`** layout width — applies to all pages including the editor (D-07 from Phase 2)

### Integration Points
- `AppHeader` → add "New Entry" button that links to `/new`
- `/entries/[id]/page.tsx` → add Edit button (link to `/entries/[id]/edit`) + Delete button (triggers AlertDialog)
- FTS5 triggers: already set up in Phase 1 schema init — `INSERT`/`UPDATE`/`DELETE` on `entries` automatically keeps `entries_fts` in sync; no extra FTS work needed in Phase 3

</code_context>

<specifics>
## Specific Ideas

- The autosave indicator should use the three-state pattern: `"Saving..."` while the Server Action is in flight, then `"Saved just now"` briefly, then fade to nothing — so the editor chrome is clean when idle.
- Tag chips in the editor should visually match the `TagChip` components on entry cards (same color/size), with an added `×` affordance only in the editor context.
- The `/new` page should not create a DB record until the user types something — avoids empty ghost entries if the user navigates away immediately.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Write-Loop*
*Context gathered: 2026-05-25*
