<!-- GSD:project-start source:PROJECT.md -->
## Project

**Dev Journal**

A personal web app built in Next.js for writing daily developer journal entries. You write free-form Markdown entries, tag them by project, and search or filter past entries to find what you worked on and learned. Single-user, no login, runs locally.

**Core Value:** A fast place to write and later find anything you've worked on — entries should be writable in seconds and searchable in seconds.

### Constraints

- **Tech Stack**: Next.js + SQLite — keep it local and dependency-light
- **Deployment**: localhost only for v1 — no server/cloud requirements
- **Auth**: None — single user, private machine
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 16.2.6 | App framework | User's chosen framework; App Router is current standard |
| React | 19.x (peer) | UI runtime | Bundled with Next.js 16 |
| TypeScript | 5.x | Type safety | Default in all Next.js scaffolding; catches schema drift early |
### Database Layer
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| better-sqlite3 | 12.10.0 | SQLite driver | Synchronous API is correct for Node.js Server Actions — avoids async callback overhead; fastest SQLite library for Node.js; well-maintained |
| Drizzle ORM | 0.45.2 | Query builder + schema | Thin TypeScript-native ORM; generates type-safe queries; pairs naturally with better-sqlite3; schema-first with migration CLI |
| drizzle-kit | 0.31.10 | Migration CLI | Generates SQL migrations from schema; simple push workflow for local dev |
| @types/better-sqlite3 | 7.6.13 | Type definitions | Required for TypeScript |
### UI / Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.3.0 | Utility-first styling | Standard for Next.js in 2025; zero runtime; v4 is current stable |
| shadcn/ui | 2.9.0 (CLI) | Component primitives | Copy-paste components built on Radix UI + Tailwind; no bundle bloat; full control over markup |
### Markdown Editor
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @uiw/react-md-editor | 4.1.0 | Split-pane markdown editor | Provides editor + live preview in one component; good DX for a writing app; works in Next.js via `dynamic()` with `ssr: false` |
### Markdown Rendering (read view)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-markdown | 10.1.0 | Render stored markdown to HTML | Safe by default (no dangerouslySetInnerHTML); plugin-extensible via remark/rehype |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown plugin | Tables, strikethrough, task lists — expected by developers |
| rehype-highlight | 7.0.2 | Code block syntax highlighting | Applies highlight.js classes to fenced code blocks — essential for a dev journal |
### Full-Text Search
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| SQLite FTS5 (built-in) | — | Full-text search index | FTS5 is built into SQLite ≥ 3.9 (2015); zero extra dependencies; supports prefix search, BM25 ranking, phrase queries |
## Key Decisions Explained
### SQLite Driver: better-sqlite3, not prisma or raw sqlite3
- **better-sqlite3 vs raw sqlite3:** `sqlite3` (the npm package) uses an async callback API that is fundamentally wrong for CPU-bound database work — it still serializes all operations on a single thread but adds callback indirection and event-loop overhead. `better-sqlite3` is synchronous and measurably faster. Official docs state it was designed specifically to address this flaw.
- **better-sqlite3 vs Prisma:** Prisma adds a binary query engine (~50 MB), a migration daemon, and significant startup overhead. For a local single-user app with a two-table schema, this is pure cost with no benefit. Prisma is justified for multi-database, multi-environment production systems — not here.
- **Drizzle ORM over raw SQL:** Drizzle provides TypeScript-typed query results and a migration CLI (`drizzle-kit`) without adding a query engine or runtime proxy. It compiles directly to SQL via `better-sqlite3` with negligible overhead. For a journal with 2–3 tables, the schema definition and typed queries are worth the thin dependency.
### Markdown Editor: @uiw/react-md-editor, not TipTap
- **TipTap** is a rich-text editor (ProseMirror-based) that stores content as a JSON document model, not Markdown. Getting Markdown in/out requires `@tiptap/extension-markdown`, which converts between formats on every keystroke. For a journal that stores raw `.md` text in SQLite, this round-trip is unnecessary complexity and a potential source of formatting loss.
- **@uiw/react-md-editor** stores and emits raw Markdown strings. The component integrates cleanly with Next.js via `dynamic(() => import(...), { ssr: false })`. Split-pane preview is built in and can be toggled. This is the correct tool for a Markdown-native storage model.
- **Plain textarea** is too bare — no syntax highlighting, no preview.
- **CodeMirror** is excellent but requires assembling extensions manually; @uiw/react-md-editor wraps CodeMirror under the hood anyway.
### Markdown Rendering: react-markdown, not marked or raw HTML
- `marked` and `markdown-it` produce raw HTML strings that require `dangerouslySetInnerHTML` — unsafe even in a local app (XSS from imported files). `react-markdown` renders to React elements and sanitizes by default.
- The plugin system (remark/rehype) is composable: add GFM support and syntax highlighting without forking the library.
### Full-Text Search: SQLite FTS5, not client-side or LIKE
- `LIKE '%query%'` cannot use indexes and performs a full table scan. It also does not support phrase matching, stemming, or ranking.
- Client-side filtering (load all entries, filter in JS) breaks down at even modest entry counts (~500+ entries) and wastes memory.
- FTS5 is compiled into every standard SQLite binary on macOS, Windows, and Linux. It requires a `CREATE VIRTUAL TABLE entries_fts USING fts5(...)` and a trigger to keep it in sync. Queries use `WHERE entries_fts MATCH ?`, which returns BM25-ranked results. Zero extra dependencies.
### Server Actions vs API Routes
- The App Router's Server Actions (`'use server'` directive) are the current Next.js recommendation for data mutations. They eliminate the boilerplate of `fetch('/api/...')` + request parsing + response serialization.
- `better-sqlite3`'s synchronous API is fully compatible with Server Actions running in the Node.js runtime (not Edge runtime). Do not set `runtime = 'edge'` — Edge runtime lacks Node.js APIs including `fs` and native addons.
- API Route Handlers (`app/api/*/route.ts`) remain appropriate for: external webhook receivers, file download endpoints, or any case where a stable URL contract matters. For internal CRUD in this app, they add no value.
- Cache invalidation after mutations: call `revalidatePath('/')` or `refresh()` from `next/cache` inside the Server Action to refresh the client router.
### UI: Tailwind + shadcn/ui, not a component framework
- shadcn/ui components are copied into the repo (not imported from a package), so they are fully customizable and add no bundle overhead beyond what you use.
- Tailwind v4 (released 2025) is the current stable version with CSS-first configuration — compatible with Next.js 16's App Router.
- Heavy component frameworks (MUI, Chakra) bundle significant CSS-in-JS runtime overhead and enforce design systems that conflict with custom styling — wrong tradeoff for a personal tool.
## What NOT to Use
| Library | Why Not |
|---------|---------|
| Prisma | 50 MB binary engine, daemon overhead, overkill for 2-table local app |
| node-sqlite3 (sqlite3 npm) | Async callback API creates event-loop overhead for CPU-bound DB work; slower than better-sqlite3 |
| TipTap | Rich-text (ProseMirror JSON), not Markdown-native; round-trip conversion loses fidelity |
| marked / markdown-it | Produce raw HTML strings requiring `dangerouslySetInnerHTML`; no React integration |
| MUI / Chakra / Mantine | CSS-in-JS runtime cost; opinionated design system hard to override; excess for a personal tool |
| `LIKE '%q%'` search | No index, full table scan, no ranking, no phrase matching |
| Edge runtime | Incompatible with better-sqlite3 (requires native Node.js addon + fs access) |
| next-auth | No authentication needed — single-user local app |
## Installation
# Create project
# Database
# Markdown editor (dynamic import in Next.js)
# Markdown rendering + plugins
# UI components
# Then add components as needed:
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Drizzle ORM | Prisma | Binary engine, daemon overhead, overkill |
| ORM | Drizzle ORM | Raw SQL | Less type safety, manual row mapping |
| SQLite driver | better-sqlite3 | sqlite3 (node-sqlite3) | Async API wrong for CPU-bound work, slower |
| Editor | @uiw/react-md-editor | TipTap | Not Markdown-native; JSON document model |
| Editor | @uiw/react-md-editor | Plain textarea | No preview, no syntax highlighting |
| Renderer | react-markdown | marked | Raw HTML, dangerouslySetInnerHTML required |
| Search | FTS5 | LIKE queries | No index, full scan, no ranking |
| Search | FTS5 | Client-side filter | Loads all data, breaks at scale |
| UI | Tailwind + shadcn/ui | MUI/Chakra | CSS-in-JS runtime, over-engineered for personal tool |
| Data layer | Server Actions | API Routes | Server Actions are the current App Router standard for mutations |
## Sources
- better-sqlite3 API docs: https://github.com/wiselibs/better-sqlite3/blob/master/docs/api.md (Context7, HIGH confidence)
- Drizzle ORM SQLite README: https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/sqlite-core/README.md (Context7, HIGH confidence)
- react-markdown README: https://github.com/remarkjs/react-markdown (Context7, HIGH confidence)
- @uiw/react-md-editor Next.js integration: https://github.com/uiwjs/react-md-editor/blob/master/core/README.md (Context7, HIGH confidence)
- TipTap Next.js docs: https://github.com/ueberdosis/tiptap-docs/blob/main/src/content/editor/getting-started/install/nextjs.mdx (Context7, HIGH confidence)
- Next.js Server Actions docs: https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/mutating-data.mdx (Context7, HIGH confidence)
- shadcn/ui Next.js installation: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/installation/next.mdx (Context7, HIGH confidence)
- All version numbers: npm registry current as of 2026-05-21 (HIGH confidence)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
