import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { db } from '@/lib/db';
import { searchEntries } from '@/lib/actions';

// In-memory SQLite instance — injected into db.$client so searchEntries()
// uses the in-memory DB during tests. Recreated per test for isolation.
let sqlite: InstanceType<typeof Database>;
let originalClient: InstanceType<typeof Database>;

beforeEach(() => {
  sqlite = new Database(':memory:');

  // Enable foreign key enforcement
  sqlite.pragma('foreign_keys = ON');

  // Create schema matching src/lib/db/schema.ts exactly, plus FTS5 virtual table + triggers
  sqlite.exec(`
    CREATE TABLE entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL DEFAULT '',
      body       TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE tags (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE entry_tags (
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
      PRIMARY KEY (entry_id, tag_id)
    );

    -- FTS5 virtual table (content table pattern — keeps data in entries, FTS index separate)
    CREATE VIRTUAL TABLE entries_fts
      USING fts5(title, body, content=entries, content_rowid=id);

    -- Triggers to keep FTS index in sync with entries table
    CREATE TRIGGER entries_fts_insert
      AFTER INSERT ON entries BEGIN
        INSERT INTO entries_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
      END;

    CREATE TRIGGER entries_fts_update
      AFTER UPDATE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, body)
          VALUES ('delete', old.id, old.title, old.body);
        INSERT INTO entries_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
      END;

    CREATE TRIGGER entries_fts_delete
      AFTER DELETE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, body)
          VALUES ('delete', old.id, old.title, old.body);
      END;
  `);

  // Swap the drizzle db's underlying sqlite client for our in-memory instance.
  // db.$client is the raw better-sqlite3 Database — replacing it makes all
  // db.$client.prepare() calls in searchEntries() hit the in-memory DB.
  // We also swap db.session.client so Drizzle's query builder (.all()/.run())
  // routes through the in-memory DB (session stores its own client reference).
  originalClient = db.$client;
  (db as unknown as { $client: InstanceType<typeof Database> }).$client = sqlite;
  // Also patch the session's internal client reference used by the Drizzle
  // query builder (db.select()...all() etc.)
  const session = (db as unknown as { session: { client: InstanceType<typeof Database> } }).session;
  if (session) session.client = sqlite;
});

afterEach(() => {
  // Restore the original client so other test files are not affected
  (db as unknown as { $client: InstanceType<typeof Database> }).$client = originalClient;
  const session = (db as unknown as { session: { client: InstanceType<typeof Database> } }).session;
  if (session) session.client = originalClient;
  sqlite.close();
});

// Helper: insert a test entry and return its id
function insertEntry(title: string, body: string): number {
  const result = sqlite
    .prepare('INSERT INTO entries (title, body) VALUES (?, ?) RETURNING id')
    .get(title, body) as { id: number };
  return result.id;
}

// Helper: insert a tag and return its id (upsert)
function insertTag(name: string): number {
  sqlite.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
  const row = sqlite.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: number };
  return row.id;
}

// Helper: link an entry to a tag
function linkTag(entryId: number, tagId: number): void {
  sqlite.prepare('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)').run(entryId, tagId);
}

// ---------------------------------------------------------------------------
// searchEntries — no filters (delegates to getEntries)
// ---------------------------------------------------------------------------
describe('searchEntries — no filters', () => {
  it('returns all entries when q is empty string and tag is null', async () => {
    insertEntry('React Hooks', 'Learning useState and useEffect');
    insertEntry('TypeScript basics', 'Types and interfaces');

    const results = await searchEntries('', null);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);
  });

  it('returns all entries when both q and tag are null', async () => {
    insertEntry('Entry one', 'Body one');
    insertEntry('Entry two', 'Body two');

    const results = await searchEntries(null, null);

    expect(results.length).toBe(2);
  });

  it('returns empty array (not throw) when database is empty and both params are null', async () => {
    const results = await searchEntries(null, null);
    expect(results).toEqual([]);
  });

  it('returns EntryListItem shape with tags array', async () => {
    const entryId = insertEntry('Tagged Entry', 'Some body');
    const tagId = insertTag('typescript');
    linkTag(entryId, tagId);

    const results = await searchEntries(null, null);

    expect(results[0]).toMatchObject({
      id: entryId,
      title: 'Tagged Entry',
      tags: ['typescript'],
    });
    expect(typeof results[0].snippet).toBe('string');
    expect(typeof results[0].dateLabel).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// searchEntries — keyword only (SRCH-01)
// ---------------------------------------------------------------------------
describe('searchEntries — keyword only (SRCH-01)', () => {
  it('returns only entries containing the keyword in title or body', async () => {
    insertEntry('React Hooks deep dive', 'Exploring useState and useEffect');
    insertEntry('TypeScript generics', 'Type parameters and constraints');
    insertEntry('React performance', 'useMemo and useCallback');

    const results = await searchEntries('React', null);

    expect(results.length).toBe(2);
    const titles = results.map(r => r.title);
    expect(titles).toContain('React Hooks deep dive');
    expect(titles).toContain('React performance');
    expect(titles).not.toContain('TypeScript generics');
  });

  it('returns empty array (not throw) when no entries match the keyword', async () => {
    insertEntry('TypeScript generics', 'Type parameters and constraints');

    const results = await searchEntries('python', null);

    expect(results).toEqual([]);
  });

  it('returns empty array when database is empty', async () => {
    const results = await searchEntries('react', null);
    expect(results).toEqual([]);
  });

  it('includes tags in returned EntryListItem objects', async () => {
    const entryId = insertEntry('React with TypeScript', 'Using React and TypeScript together');
    const tagId = insertTag('typescript');
    linkTag(entryId, tagId);

    const results = await searchEntries('React', null);

    expect(results.length).toBe(1);
    expect(results[0].tags).toContain('typescript');
  });

  it('does not throw for FTS5-special characters in q (sanitization absorbs them)', async () => {
    insertEntry('React hooks', 'useState demo');

    await expect(searchEntries('"react', null)).resolves.not.toThrow();
    await expect(searchEntries('react-hooks', null)).resolves.not.toThrow();
    await expect(searchEntries('react AND hooks', null)).resolves.not.toThrow();
    await expect(searchEntries('react OR typescript', null)).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// searchEntries — tag filter only (SRCH-02)
// ---------------------------------------------------------------------------
describe('searchEntries — tag filter only (SRCH-02)', () => {
  it('returns only entries with the specified tag', async () => {
    const entry1 = insertEntry('React Hooks', 'useState basics');
    const entry2 = insertEntry('TypeScript generics', 'Type params');
    const entry3 = insertEntry('Node.js streams', 'Readable and Writable');

    const tsTagId = insertTag('typescript');
    const reactTagId = insertTag('react');
    linkTag(entry1, reactTagId);
    linkTag(entry2, tsTagId);

    const results = await searchEntries(null, 'typescript');

    expect(results.length).toBe(1);
    expect(results[0].id).toBe(entry2);
    expect(results[0].tags).toContain('typescript');
    void entry3; // not tagged — validates it's not returned
  });

  it('returns empty array when no entries have the specified tag', async () => {
    const reactTagId = insertTag('react');
    const entryId = insertEntry('React entry', 'useState');
    linkTag(entryId, reactTagId);

    const results = await searchEntries(null, 'python');

    expect(results).toEqual([]);
  });

  it('returns empty array when database is empty', async () => {
    const results = await searchEntries(null, 'typescript');
    expect(results).toEqual([]);
  });

  it('returns tags array correctly on tag-filtered results', async () => {
    const entryId = insertEntry('Full stack dev', 'Using React and TypeScript');
    const tsTagId = insertTag('typescript');
    const reactTagId = insertTag('react');
    linkTag(entryId, tsTagId);
    linkTag(entryId, reactTagId);

    const results = await searchEntries(null, 'typescript');

    expect(results.length).toBe(1);
    expect(results[0].tags).toContain('typescript');
    expect(results[0].tags).toContain('react');
  });
});

// ---------------------------------------------------------------------------
// searchEntries — combined keyword + tag (SRCH-03)
// ---------------------------------------------------------------------------
describe('searchEntries — combined keyword + tag (SRCH-03)', () => {
  it('returns only entries matching both keyword and tag', async () => {
    const entry1 = insertEntry('React Hooks', 'useState and useEffect with TypeScript');
    const entry2 = insertEntry('React without types', 'Plain JavaScript hooks');
    const entry3 = insertEntry('TypeScript basics', 'Pure TS, no hooks mentioned');

    const tsTagId = insertTag('typescript');
    const reactTagId = insertTag('react');
    linkTag(entry1, tsTagId);
    linkTag(entry1, reactTagId);
    linkTag(entry2, reactTagId);
    linkTag(entry3, tsTagId);

    const results = await searchEntries('React', 'typescript');

    expect(results.length).toBe(1);
    expect(results[0].id).toBe(entry1);
  });

  it('returns empty array when no entries match both keyword and tag', async () => {
    const reactTagId = insertTag('react');
    const entry1 = insertEntry('React Hooks', 'useState demo');
    linkTag(entry1, reactTagId);

    const results = await searchEntries('React', 'typescript');

    expect(results).toEqual([]);
  });

  it('returns empty array when database is empty', async () => {
    const results = await searchEntries('react', 'typescript');
    expect(results).toEqual([]);
  });

  it('includes all tags in returned entries (not just the filtered tag)', async () => {
    const entryId = insertEntry('React and TypeScript project', 'Building with both');
    const tsTagId = insertTag('typescript');
    const reactTagId = insertTag('react');
    const projectTagId = insertTag('project');
    linkTag(entryId, tsTagId);
    linkTag(entryId, reactTagId);
    linkTag(entryId, projectTagId);

    const results = await searchEntries('React', 'typescript');

    expect(results.length).toBe(1);
    expect(results[0].tags).toContain('typescript');
    expect(results[0].tags).toContain('react');
    expect(results[0].tags).toContain('project');
  });

  it('does not throw for FTS5-special characters combined with tag filter', async () => {
    const tsTagId = insertTag('typescript');
    const entryId = insertEntry('React project', 'Building things');
    linkTag(entryId, tsTagId);

    await expect(searchEntries('"react', 'typescript')).resolves.not.toThrow();
    await expect(searchEntries('react-hooks', 'typescript')).resolves.not.toThrow();
  });
});
