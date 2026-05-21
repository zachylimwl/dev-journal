# Feature Landscape

**Domain:** Personal developer journal / developer notes app
**Researched:** 2026-05-21
**Confidence:** MEDIUM-HIGH (based on established patterns from Obsidian, Bear, Notion, Day One, Logseq, TIL log patterns — all mature, stable tools)

---

## Table Stakes

Features users expect from having used Obsidian, Bear, Notion, or any modern note tool. Missing these makes the app feel unfinished or frustrating to use daily.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Instant (live) search | Every major tool (Obsidian, Bear, Notion) reacts on keypress. Submit-on-enter search feels broken. | Low | Debounce 150-300ms. No extra infra needed with SQLite FTS. |
| Markdown rendering (not raw text) | Developers write in Markdown constantly. Raw text feels unfinished. | Low-Med | Use `react-markdown` or `markdown-it`. Not optional for dev audience. |
| GitHub-flavored Markdown code blocks | Fenced code with syntax highlighting is the minimum for a dev journal. Missing it is jarring for the target user. | Med | Use `rehype-highlight` or `shiki`. Only needed in rendered view. |
| Tag-based filtering | Obsidian, Bear, Notion all use tags as primary organization. Click tag → filter entries. | Low | Flat tags, not hierarchical. Store as array in SQLite. |
| Chronological order, newest first | Dominant pattern in Bear, Day One, all journal-type apps. Dev journals are read backwards. | Low | Default sort; optional toggle. |
| Entry list with date + preview snippet | Bear sidebar, Notion database view — users scan before opening. Title alone is not enough. | Low | First 80-120 chars of body text stripped of Markdown. |
| Keyboard shortcut to create new entry | Friction at entry creation kills daily habit. One keystroke to a blank editor. | Low | Cmd/Ctrl+N is the convention. |
| Autosave | Every modern editor autosaves. A Save button that can lose work destroys trust. | Low | Debounce 500ms-1s after last keystroke. No explicit save action needed. |
| Combined search + tag filter | Users need to narrow: "show entries tagged #auth that mention JWT". | Low-Med | SQLite FTS + WHERE clause on tags is straightforward. |
| Delete entry with confirmation | Standard CRUD. No soft-delete needed for personal tool. | Low | Confirm modal to prevent accidental deletion. |

---

## Differentiators

Features that elevate the experience from "functional" to "great." Not universally expected, but strongly appreciated when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Fuzzy / highlighted search matches | Obsidian and VS Code highlight matched substrings in results. Users immediately see *why* a result matched. | Med | SQLite FTS5 `snippet()` function returns highlighted fragments. Makes search feel smart rather than blunt. |
| Live Markdown preview (WYSIWYG-ish) | Typora/Craft/Obsidian's approach: render inline as you type. Eliminates mode-switching mental load. | Med-High | Can start with split-pane raw+preview and treat live preview as enhancement. |
| Relative date display | "Today", "Yesterday", "3 days ago" instead of raw ISO dates. Makes temporal context feel natural. | Low | Simple utility function. Bear does this well. |
| Tag autocomplete on entry editor | Suggests existing tags as user types. Prevents tag fragmentation (#backend, #be, #back-end for the same concept). | Med | Needs tag index query on keypress in tag input field. |
| Entry count per tag in sidebar | Shows `#auth (12)` — tells you which tags are well-used vs. orphaned. Helps with maintenance. | Low | Aggregate query on tag index. |
| Keyboard navigation (j/k or arrow) in entry list | Power-user pattern from Vim, Gmail, Obsidian. Move between entries without mouse. | Low | Event listener on list container. |
| Empty state with quick-start prompt | First-run "Write your first entry" CTA. Small but prevents blank-page paralysis. | Low | Conditional render. |
| Readable line width cap | Long lines in a full-width editor are hard to read. Capping at ~65-75ch matches Bear/Craft. | Low | Pure CSS `max-width` on editor/content column. |

---

## Anti-Features

Things to deliberately NOT build. Each adds implementation cost, maintenance burden, or UX noise with zero value for a solo developer on localhost.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Rich text toolbar (Bold/Italic buttons) | Developers type Markdown directly. A floating toolbar adds visual noise and implementation complexity. | Trust the user to type `**bold**`. Keyboard shortcuts (`Cmd+B`) are acceptable as a later enhancement. |
| Collaboration / sharing | Single-user localhost app. Zero use case. | Nothing. |
| Cloud sync UI | Out of scope. Adds auth, server infra, and reliability surface. | SQLite file lives on disk — user can back it up manually or with any existing backup tool. |
| Nested/hierarchical tags | Tag trees (`#project/backend/auth`) feel powerful but create solo maintenance burden. Hard to prune. | Flat tags only. If a user has 50 tags, search filters them. |
| Image / file attachments | Drag-and-drop images raise immediate questions: SQLite blobs? Filesystem path? Where do files go on new machine? | Text-first. Paste an image URL if needed. |
| Entry templates | Tempting, but adds a template management UI. A dev can type their own structure or paste from a snippet. | Start entries blank. |
| Streak / habit tracking | Contribution graph and streak counters optimize for frequency over quality. Becomes a guilt mechanic for personal journaling. | Deferred to v2 per PROJECT.md — even then, consider carefully. |
| Full revision history | Versioning table adds schema complexity and storage growth. Autosave to current row is sufficient. | Trust autosave. If the user wants history, they can use Git on the SQLite file. |
| Comments / annotations on entries | Zero value single-user. | Nothing. |
| Export wizards (PDF, HTML, Docx) | Complex formatting edge cases. Deferred to v2 per PROJECT.md. | v2: plain Markdown export is sufficient and trivial to add later. |
| Entry pinning / starring | Adds a UI affordance and sort complexity. For a searchable journal, search replaces manual curation. | Use search and tags. |
| Multiple notebooks / folders | Adds organizational hierarchy above tags. Tags cover this for a solo user. | Flat entry list + tags. |

---

## Feature Dependencies

```
Tag filtering → Tag storage on entries (write before you can filter)
Search + tag filter combined → Both search index AND tag storage must exist
Fuzzy/highlighted search → SQLite FTS5 (not FTS4 — snippet() is FTS5)
Tag autocomplete → Tag index / distinct tag query
Entry preview snippet → Body text stored (or computable) separately from rendered Markdown
```

---

## MVP Recommendation

Prioritize in this order:

1. **Create entry with Markdown body + tags** — core write loop
2. **Autosave** — without this, daily use is anxious
3. **Entry list (newest first, with date + preview snippet)** — read loop
4. **Tag filter** — organization
5. **Full-text search (live, on keypress)** — find loop
6. **Combined search + tag filter** — the full query experience
7. **Delete with confirmation** — CRUD completeness
8. **Syntax highlighted code blocks in rendered view** — dev-audience requirement

Defer to post-MVP:
- Fuzzy search + match highlighting (plain FTS5 is acceptable for v1)
- Tag autocomplete
- Relative dates (cosmetic)
- Keyboard navigation (power-user convenience)
- Live/inline Markdown preview (split pane is acceptable for v1)

---

## Sources

- **HIGH confidence (stable, mature tools):** Obsidian feature set (obsidian.md), Bear app UX patterns, Notion database views, Day One journal conventions, Logseq daily notes — all well-established and observed across multiple years of community use.
- **MEDIUM confidence:** Specific UX micro-details (exact debounce values, line-width preferences) drawn from community discussions and design references; validate against user feedback.
- **Note:** No external web fetch performed — research based on training knowledge of these established tools (knowledge cutoff August 2025). The tools listed above are stable; their core UX patterns have not changed materially in 2+ years.
