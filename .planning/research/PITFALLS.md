# Domain Pitfalls

**Domain:** Next.js personal developer journal (SQLite, Markdown editor, full-text search)
**Researched:** 2026-05-21
**Confidence:** HIGH for SQLite/Next.js native module issues (extensively documented); MEDIUM for editor state and FTS edge cases (pattern-based)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or undebuggable runtime crashes.

---

### Pitfall 1: better-sqlite3 Native Module Bundling Failure

**What goes wrong:** Next.js webpack tries to bundle `better-sqlite3` into the client or server bundle. Because `better-sqlite3` is a native Node addon (`.node` binary), webpack cannot bundle it. The build either silently omits it, throws `Module not found`, or crashes with `Cannot find module '.../better_sqlite3.node'` at runtime.

**Why it happens:** Next.js treats all imports as bundleable by default. Native addons require the Node binary to be loaded at runtime via `require()`, not statically analyzed. Webpack has no concept of `.node` files.

**Consequences:** App crashes on first DB call. Often only manifests in production build (`next build`), not during `next dev` if the module happens to resolve via the filesystem.

**Prevention:**
- In `next.config.js`, add `better-sqlite3` to `serverExternalPackages` (Next.js 14+) or `experimental.serverComponentsExternalPackages` (Next.js 13):
  ```js
  // next.config.js
  const nextConfig = {
    serverExternalPackages: ['better-sqlite3'],
  };
  ```
- Never import `better-sqlite3` in any file that could be included in a client component bundle. Keep all DB code in files with `'use server'` or in `/lib/db.ts` that is only ever imported server-side.

**Detection:** Run `next build` early in Phase 1. If the build succeeds but the app crashes on first DB call with a `.node` module error, this is the issue.

**Phase:** Address in Phase 1 (foundation/DB setup). Validate with a `next build` smoke test before writing any features.

---

### Pitfall 2: Hot Reload Creates Multiple SQLite Connections (Connection Leak)

**What goes wrong:** In `next dev`, every file save triggers HMR. If the DB connection is initialized at module scope (top-level `new Database(path)`), each hot reload creates a new connection without closing the previous one. SQLite allows multiple readers but has write contention. After enough reloads, you accumulate dangling connections, see `SQLITE_BUSY` errors, or see the WAL file grow unbounded.

**Why it happens:** Node.js module cache is partially invalidated during HMR. The module re-executes, calling the constructor again, but the old connection object is not garbage collected immediately.

**Consequences:** `SQLITE_BUSY: database is locked` errors during development. Inconsistent write behavior. Misleading bugs that disappear after restarting the dev server.

**Prevention:** Use a singleton pattern with the global object, which persists across HMR cycles:
```ts
// lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'journal.db');

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

export const db: Database.Database =
  global.__db ?? (global.__db = new Database(DB_PATH));
```
This is the same pattern Next.js officially recommends for Prisma clients.

**Detection:** Warning sign is `SQLITE_BUSY` errors only during `next dev`, never after `next build && next start`. Also: the `.db-wal` file grows across saves without writes.

**Phase:** Address in Phase 1 alongside the DB module setup.

---

### Pitfall 3: SQLite File Path Resolution Diverges Between Dev and Build

**What goes wrong:** Using a relative path like `new Database('./journal.db')` resolves relative to the Node.js process working directory (`process.cwd()`), which is the project root in both dev and build. However, if the path is constructed relative to `__dirname` or `import.meta.url`, it resolves relative to the compiled output directory (`/.next/server/`), producing a path like `/.next/server/journal.db` — a different file than the one in the project root.

**Why it happens:** Next.js compiles server code into `.next/server/`. `__dirname` inside compiled code points to `.next/server/chunks/`, not the project root.

**Consequences:** Two different database files in dev vs. production. Data written in dev is not visible after `next build`. Silent data loss — no error, just an empty database.

**Prevention:** Always use `process.cwd()` to anchor the DB file path:
```ts
const DB_PATH = path.join(process.cwd(), 'data', 'journal.db');
```
Never use `__dirname`, `import.meta.dirname`, or relative strings. Store the DB file outside `.next/` (e.g., `./data/` or project root).

**Detection:** Create an entry in `next dev`. Run `next build && next start`. If the entry is gone, the dev and prod DB files are different paths. Check for `journal.db` in `.next/server/`.

**Phase:** Address in Phase 1. Encode the path strategy in the DB module before any features are built.

---

### Pitfall 4: Server Actions Block the Node.js Event Loop

**What goes wrong:** `better-sqlite3` is intentionally synchronous. Every `db.prepare().run()` or `db.prepare().get()` call blocks the Node.js event loop for its duration. In Next.js Server Actions, this is fine for a single-user local app — but if any query is slow (e.g., unindexed FTS search over thousands of entries), the entire server is unresponsive for that duration, including any concurrent requests (e.g., the browser loading static assets).

**Why it happens:** Node.js is single-threaded. Synchronous SQLite holds the thread. For a personal localhost tool this is an acceptable tradeoff, but it becomes perceptible once unindexed queries run on large datasets.

**Consequences:** UI freezes, spinner never resolves, browser shows "waiting for server" for multiple seconds. Especially bad if FTS search is triggered on every keystroke.

**Prevention:**
1. Add proper indexes (FTS5 virtual table for search, index on `created_at`, index on the tag join table).
2. Never trigger search on every keystroke — debounce at minimum 300ms, prefer explicit submit.
3. For a local single-user app, this is a low-risk tradeoff. Do not reach for `better-sqlite3-worker-threads` prematurely; address if observed.

**Detection:** Warning sign is search queries taking >100ms in the SQLite CLI. Run `EXPLAIN QUERY PLAN SELECT ...` to confirm index usage.

**Phase:** Index design in Phase 1 (schema). Debounce in Phase 2/3 (search UI). FTS5 virtual table in the search phase.

---

## Moderate Pitfalls

---

### Pitfall 5: Markdown Editor Uncontrolled/Controlled State Mismatch

**What goes wrong:** Using a `<textarea>` or a rich Markdown editor component with `value={entry.content}` tied directly to server-fetched data causes React to throw `Warning: A component is changing an uncontrolled input to be controlled` — or the reverse. This often surfaces when the editor initializes before the data fetch resolves, or when the parent re-renders with a new `entry` prop while the user is mid-edit.

**Why it happens:** React requires a consistent choice: either always controlled (`value` + `onChange`) or always uncontrolled (`defaultValue`). Mixing — e.g., `value={undefined}` on first render then `value="actual content"` on second — violates this contract.

**Consequences:** Cursor jumps to end of textarea on every parent re-render. Content resets mid-edit. React warnings in console. Lost edits if the parent re-fetches while the user is typing.

**Prevention:**
- Use a local state variable initialized from the prop, not the prop directly:
  ```ts
  const [content, setContent] = useState(entry?.content ?? '');
  ```
- Only reinitialize when the entry ID changes (not on every re-render):
  ```ts
  useEffect(() => {
    setContent(entry?.content ?? '');
  }, [entry?.id]);
  ```
- Never pass `entry.content` directly as `value` to the editor.

**Detection:** Cursor teleporting to end of input while typing. React DevTools showing the component re-rendering with a new `value` prop mid-edit.

**Phase:** Address in Phase 2 (editor component). Critical to get right before adding autosave.

---

### Pitfall 6: FTS5 Choking on Special Characters and Empty Queries

**What goes wrong:** SQLite FTS5 uses its own query syntax. Passing user input directly into an FTS5 `MATCH` clause breaks on: double quotes (`"`), asterisks used as wildcards, hyphens (treated as NOT operator), parentheses, and empty strings. An empty `MATCH ''` throws `fts5: syntax error near ""`. A query like `C++` breaks on `+`. A query like `react-query` is parsed as `react` NOT `query`.

**Why it happens:** FTS5 has a mini query language. Raw user input is not safe to pass unescaped.

**Consequences:** Runtime SQLite errors crash Server Actions. Searches for common developer terms (`C++`, `node-modules`, `async/await`) return wrong results or throw. Empty search field throws instead of returning all entries.

**Prevention:**
```ts
function sanitizeFtsQuery(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null; // caller returns all entries
  // Escape double quotes, strip FTS5 operators
  return '"' + trimmed.replace(/"/g, '""') + '"';
}
```
Wrapping the entire query in double quotes treats it as a phrase literal, suppressing FTS5 operator parsing. For prefix search, use `"term"*` instead of `term*`.

For empty query: return all entries unfiltered, do not pass to `MATCH`.

**Detection:** Test with: empty string, `"quoted"`, `C++`, `node-modules`, `async/await`, a single space. Any unhandled exception from the DB layer is this pitfall.

**Phase:** Address in Phase 3 (search feature). Write a small test suite for the sanitizer function before wiring up the UI.

---

### Pitfall 7: Markdown Prose Styles Bleeding Into Code Blocks

**What goes wrong:** When using Tailwind CSS with the `@tailwindcss/typography` plugin (`prose` class), the `prose` styles apply to all descendants — including `<code>` and `<pre>` blocks rendered from Markdown. This causes: monospace font being overridden by the prose font stack, line-height mismatches making code illegible, and code block backgrounds conflicting with syntax highlighter themes.

**Why it happens:** `prose` is a broad CSS reset that targets `code`, `pre`, and `code *` selectors. Syntax highlighters like `rehype-highlight` or `react-syntax-highlighter` inject their own class-based styles, but `prose` specificity can win.

**Consequences:** Code blocks look unstyled or broken. Inline code renders with wrong font or size. Pre-formatted content loses its indentation structure.

**Prevention:**
- Use `prose-pre:p-0 prose-pre:bg-transparent` Tailwind modifiers to neutralize prose's pre-block overrides, then let the syntax highlighter own the styling.
- Or: wrap the Markdown render in a container that scopes `prose` but apply `not-prose` to code block wrappers.
- Test every Markdown element type (h1-h6, ul, ol, blockquote, inline code, fenced code, table, hr) in the rendered preview before shipping.

**Detection:** Render a Markdown entry containing a fenced code block with a syntax highlighter. If the code font, background, or spacing looks wrong, prose is interfering.

**Phase:** Address in Phase 2 (Markdown rendering). Build a fixture entry with all element types and visually verify before moving to search.

---

### Pitfall 8: Tag Input Producing Invalid Tags (Spaces, Duplicates, Empty)

**What goes wrong:** A naive tag input (e.g., comma-separated or space-separated) produces tags with leading/trailing whitespace (` react `), duplicate tags (`react, React, react`), empty tags from double commas (`react,,nextjs`), or tags that are just whitespace. These store to the DB and can never be found or filtered reliably.

**Why it happens:** User input is not normalized before persistence. Case sensitivity is inconsistent.

**Consequences:** Filtering by tag `react` does not show entries tagged ` react`. Duplicate tags appear in the UI. The tag list grows with noise variants. Deduplication at query time is fragile.

**Prevention:** Normalize all tags at input time, before any DB write:
```ts
function normalizeTags(raw: string[]): string[] {
  return [
    ...new Set(
      raw
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0)
    )
  ];
}
```
Apply this in the Server Action before inserting, not in the UI alone (UI can be bypassed).

Also: consider a maximum tag length (e.g., 50 chars) and maximum tag count per entry (e.g., 20) to prevent accidental abuse.

**Detection:** Create an entry with tags `React, react, REACT, , react `. If the DB stores more than one distinct tag value, normalization is missing.

**Phase:** Address in Phase 2 (entry creation form). The normalization function must live in the Server Action, not just the client.

---

## Minor Pitfalls

---

### Pitfall 9: `process.cwd()` Returns Wrong Directory in Some Deployment Contexts

**What goes wrong:** `process.cwd()` is correct for `next dev` and `next build && next start` when run from the project root. If the app is ever started from a different working directory (e.g., `node .next/standalone/server.js`), `process.cwd()` points to wherever the process was launched, not the project root.

**Prevention:** This is v1 localhost-only, so it is a minor concern. Document in a `README` that the app must be started from the project root. If standalone output mode is ever used, switch to an environment variable for the DB path (`DB_PATH=...`).

**Phase:** Note in Phase 1 setup docs. Not a blocking issue for v1.

---

### Pitfall 10: FTS5 Table Out of Sync With Main Table

**What goes wrong:** FTS5 virtual tables do not automatically sync with the source data table when rows are updated or deleted via standard `UPDATE`/`DELETE`. If the FTS5 table is populated via manual `INSERT INTO entries_fts`, deletes and updates to `entries` do not propagate.

**Why it happens:** FTS5 content tables require explicit maintenance unless configured as `content=""` (contentless) or using `content=entries` with triggers.

**Prevention:** Use one of:
1. **Content table mode** (`content="entries"` in FTS5 CREATE): FTS reads from the base table, but requires triggers for delete/update to keep the index consistent. SQLite documentation provides the exact trigger templates.
2. **Manual sync in Server Actions**: every `UPDATE` or `DELETE` to `entries` also runs the corresponding FTS5 operation in the same transaction.

The trigger approach is more reliable because it is enforced at the DB layer, not the application layer.

**Detection:** Update an entry's content. Search for the new content — if not found, or old content still matches, FTS is out of sync.

**Phase:** Address in Phase 1 (schema design). The sync strategy must be decided before writing the first Server Action.

---

### Pitfall 11: Autosave Race Conditions

**What goes wrong:** If autosave is implemented with `setTimeout` debounce and the user navigates away before the timeout fires, the last edit is silently lost. If autosave fires while a manual save is in flight, two concurrent Server Actions write to the same row — the last one wins but the user sees no indication.

**Prevention:** For v1 with explicit Save button, skip autosave entirely. If autosave is added: use `useRef` to track the pending debounce timer and flush it on `beforeunload`. Use optimistic locking (a `version` column) if concurrent saves become possible.

**Phase:** Defer autosave to a later phase. Flag as needing care if added.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| DB setup | Native module bundling failure | `serverExternalPackages` in next.config.js — verify with `next build` on day one |
| DB setup | Multiple connections from hot reload | Singleton via `global.__db` pattern |
| DB setup | Wrong file path in build output | Always `path.join(process.cwd(), ...)` |
| Schema design | FTS5 sync with source table | Use content table + triggers from the start |
| Schema design | Blocking event loop | Add FTS5 + `created_at` + tag indexes upfront |
| Entry editor | Controlled/uncontrolled state | Local state initialized from prop, reset only on ID change |
| Entry editor | Tag normalization | Normalize in Server Action, not just client |
| Markdown render | Prose vs. syntax highlighter conflict | Test all element types early; use `prose-pre:` modifiers |
| Search feature | FTS5 special characters | Sanitize/escape before `MATCH`; handle empty query as "return all" |
| Search feature | Keystroke-triggered blocking queries | Debounce ≥300ms or explicit submit only |

---

## Sources

- better-sqlite3 GitHub issues and troubleshooting docs (HIGH confidence — native module bundling and hot reload issues are extensively reported)
- Next.js documentation on `serverExternalPackages` and global singleton pattern for DB clients (HIGH confidence)
- SQLite FTS5 documentation on query syntax and content table triggers (HIGH confidence)
- React documentation on controlled vs. uncontrolled inputs (HIGH confidence)
- Tailwind CSS Typography plugin documentation on `prose` modifier overrides (HIGH confidence)
- Community pattern for tag normalization in form inputs (MEDIUM confidence — standard practice, no single authoritative source)
