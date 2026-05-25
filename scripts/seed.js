// Seed script — inserts 3 test journal entries for UI verification
// Run: node scripts/seed.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), '.data', 'journal.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Init schema (idempotent)
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts
    USING fts5(title, body, content=entries, content_rowid=id);
  CREATE TRIGGER IF NOT EXISTS entries_fts_insert
    AFTER INSERT ON entries BEGIN
      INSERT INTO entries_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
    END;
`);

const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
insertTag.run('next.js');
insertTag.run('typescript');
insertTag.run('drizzle');
insertTag.run('debug');

const getTag = db.prepare('SELECT id FROM tags WHERE name = ?');
const tagIds = {
  nextjs: getTag.get('next.js').id,
  typescript: getTag.get('typescript').id,
  drizzle: getTag.get('drizzle').id,
  debug: getTag.get('debug').id,
};

const insertEntry = db.prepare('INSERT INTO entries (title, body, created_at, updated_at) VALUES (?, ?, ?, ?)');
const insertEntryTag = db.prepare('INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)');

const now = Date.now();
const oneDay = 86400000;

// Entry 1 — 3 days ago, with code block
const body1 = [
  '# Setting up Drizzle ORM with better-sqlite3',
  '',
  'Got the database layer working today. The key insight was using `serverExternalPackages` in `next.config.ts` so the native addon does not get bundled.',
  '',
  '## Schema',
  '',
  '```typescript',
  'export const entries = sqliteTable("entries", {',
  '  id: integer("id").primaryKey({ autoIncrement: true }),',
  '  title: text("title").notNull(),',
  '  body: text("body").notNull(),',
  '  createdAt: integer("created_at", { mode: "timestamp" }).notNull()',
  '              .$defaultFn(() => new Date()),',
  '});',
  '```',
  '',
  '## Key learnings',
  '',
  '- **better-sqlite3** is synchronous — no `await` needed on the actual query',
  '- Server Actions must still be `async` because Next.js requires it',
  '- Use `path.join(process.cwd(), "journal.db")` not `__dirname`',
  '',
  '## Next steps',
  '',
  '- Add FTS5 virtual table for search',
  '- Wire up the read loop UI',
].join('\n');

const e1 = insertEntry.run(
  'Setting up Drizzle ORM with better-sqlite3',
  body1,
  Math.floor((now - 3 * oneDay) / 1000),
  Math.floor((now - 3 * oneDay) / 1000)
);
insertEntryTag.run(e1.lastInsertRowid, tagIds.drizzle);
insertEntryTag.run(e1.lastInsertRowid, tagIds.typescript);

// Entry 2 — yesterday, debug entry
const body2 = [
  '# Debugging the FTS5 trigger issue',
  '',
  'Spent a few hours today chasing a bug where full-text search was not returning results.',
  '',
  '## The problem',
  '',
  'The FTS5 virtual table was not being populated because the `AFTER INSERT` trigger was missing.',
  '',
  '```sql',
  'CREATE TRIGGER entries_fts_insert AFTER INSERT ON entries BEGIN',
  '  INSERT INTO entries_fts(rowid, title, body) VALUES (new.id, new.title, new.body);',
  'END;',
  '```',
  '',
  '## Root cause',
  '',
  'I was running `initSchema()` after inserting test data during development — the trigger was created too late.',
  '',
  '## Fix',
  '',
  'Move all schema init (including triggers) to run **before** any data operations. Added a `CREATE TABLE IF NOT EXISTS` guard so it is idempotent.',
  '',
  'Lesson: always verify schema init order in a fresh DB, not just an existing one.',
].join('\n');

const e2 = insertEntry.run(
  'Debugging the FTS5 trigger issue',
  body2,
  Math.floor((now - 1 * oneDay) / 1000),
  Math.floor((now - 1 * oneDay) / 1000)
);
insertEntryTag.run(e2.lastInsertRowid, tagIds.debug);

// Entry 3 — today
const body3 = [
  '# Read loop UI complete',
  '',
  'Phase 2 done. The read loop is working end-to-end.',
  '',
  '## What shipped',
  '',
  '- **AppHeader** — sticky header with Dev Journal wordmark',
  '- **EntryCard** — title, relative date, plain-text snippet, tag chips',
  '- **MarkdownBody** — `react-markdown` with `remark-gfm` + `rehype-highlight`',
  '- **Entry detail page** — full Markdown rendering with GitHub Dark syntax highlighting',
  '',
  '## Code example (should render with syntax highlighting)',
  '',
  '```javascript',
  'async function getEntries() {',
  '  const rows = db',
  '    .select({ id: entries.id, title: entries.title })',
  '    .from(entries)',
  '    .orderBy(desc(entries.createdAt))',
  '    .all();',
  '  return rows;',
  '}',
  '```',
  '',
  '## Stack choices that paid off',
  '',
  '- `react-markdown` — no `dangerouslySetInnerHTML`, RSC-compatible, plugin-extensible',
  '- Tailwind typography (`prose`) + `prose-pre:p-0 prose-pre:bg-transparent` — prevents double padding on code blocks',
  '- GitHub Dark theme from `highlight.js/styles/github-dark.css` in globals.css — loads reliably',
  '',
  '## Up next',
  '',
  'Phase 3: write loop — new entry form with @uiw/react-md-editor',
].join('\n');

const e3 = insertEntry.run(
  'Read loop UI complete',
  body3,
  Math.floor(now / 1000),
  Math.floor(now / 1000)
);
insertEntryTag.run(e3.lastInsertRowid, tagIds.nextjs);
insertEntryTag.run(e3.lastInsertRowid, tagIds.typescript);

console.log('Seeded 3 entries:', [e1.lastInsertRowid, e2.lastInsertRowid, e3.lastInsertRowid]);
console.log('Tags:', tagIds);
db.close();
