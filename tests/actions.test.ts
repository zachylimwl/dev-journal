import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

// In-memory test database — recreated before each test for isolation
let testDb: ReturnType<typeof drizzle<typeof schema>>;

beforeEach(() => {
  const sqlite = new Database(':memory:');

  // Enable foreign key enforcement — required for ON DELETE CASCADE tests
  sqlite.pragma('foreign_keys = ON');

  // Create schema matching src/lib/db/schema.ts exactly
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
  `);

  testDb = drizzle(sqlite, { schema });
});

describe('createEntry pattern', () => {
  it('inserts a row and returns an array of length 1 with id === 1', () => {
    const result = testDb
      .insert(schema.entries)
      .values({ title: 'First Entry', body: 'Hello world' })
      .returning({ id: schema.entries.id })
      .all();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('inserts with empty title and body using defaults', () => {
    const result = testDb
      .insert(schema.entries)
      .values({ title: '', body: '' })
      .returning({ id: schema.entries.id })
      .all();

    expect(result).toHaveLength(1);
    const row = testDb
      .select({ title: schema.entries.title, body: schema.entries.body })
      .from(schema.entries)
      .where(eq(schema.entries.id, result[0].id))
      .all()[0];
    expect(row.title).toBe('');
    expect(row.body).toBe('');
  });
});

describe('updateEntry pattern', () => {
  it('updates title and body for an existing entry', () => {
    // Insert original entry
    testDb.insert(schema.entries).values({ title: 'Old Title', body: 'Old Body' }).run();

    // Update it
    testDb
      .update(schema.entries)
      .set({ title: 'New Title', body: 'New Body', updatedAt: new Date() })
      .where(eq(schema.entries.id, 1))
      .run();

    // Verify new values
    const entry = testDb
      .select({ title: schema.entries.title, body: schema.entries.body })
      .from(schema.entries)
      .where(eq(schema.entries.id, 1))
      .all()[0];

    expect(entry.title).toBe('New Title');
    expect(entry.body).toBe('New Body');
  });

  it('leaves other entries untouched when updating a specific entry', () => {
    testDb.insert(schema.entries).values({ title: 'Entry A', body: 'Body A' }).run();
    testDb.insert(schema.entries).values({ title: 'Entry B', body: 'Body B' }).run();

    // Update only entry 1
    testDb
      .update(schema.entries)
      .set({ title: 'Updated A', body: 'Updated Body A', updatedAt: new Date() })
      .where(eq(schema.entries.id, 1))
      .run();

    const entryB = testDb
      .select({ title: schema.entries.title })
      .from(schema.entries)
      .where(eq(schema.entries.id, 2))
      .all()[0];

    expect(entryB.title).toBe('Entry B');
  });
});

describe('deleteEntry with cascade', () => {
  it('deletes the entry and cascades to entry_tags', () => {
    // Insert entry
    testDb.insert(schema.entries).values({ title: 'To Delete', body: 'Content' }).run();

    // Insert tag and entry_tag junction
    testDb.insert(schema.tags).values({ name: 'tag1' }).run();
    testDb.insert(schema.entryTags).values({ entryId: 1, tagId: 1 }).run();

    // Delete the entry
    testDb.delete(schema.entries).where(eq(schema.entries.id, 1)).run();

    // Entry should be gone
    const entries = testDb
      .select()
      .from(schema.entries)
      .where(eq(schema.entries.id, 1))
      .all();
    expect(entries).toHaveLength(0);

    // entry_tags should cascade-delete
    const entryTags = testDb
      .select()
      .from(schema.entryTags)
      .where(eq(schema.entryTags.entryId, 1))
      .all();
    expect(entryTags).toHaveLength(0);

    // Tag itself should still exist (no cascade on tags)
    const tags = testDb
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.id, 1))
      .all();
    expect(tags).toHaveLength(1);
  });

  it('does not delete unrelated entries', () => {
    testDb.insert(schema.entries).values({ title: 'Entry 1', body: '' }).run();
    testDb.insert(schema.entries).values({ title: 'Entry 2', body: '' }).run();

    testDb.delete(schema.entries).where(eq(schema.entries.id, 1)).run();

    const remaining = testDb.select().from(schema.entries).all();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(2);
  });
});

describe('setEntryTags upsert pattern', () => {
  it('inserts new tag with onConflictDoNothing, no duplicate rows', () => {
    testDb.insert(schema.entries).values({ title: 'Test', body: '' }).run();

    // Insert 'existing' tag
    testDb.insert(schema.tags).values({ name: 'existing' }).run();

    // Try to insert 'existing' again — should silently skip
    testDb.insert(schema.tags).values({ name: 'existing' }).onConflictDoNothing().run();

    // Insert a new tag
    testDb.insert(schema.tags).values({ name: 'new-tag' }).onConflictDoNothing().run();

    const tags = testDb.select().from(schema.tags).all();
    expect(tags).toHaveLength(2);
    expect(tags.map(t => t.name).sort()).toEqual(['existing', 'new-tag']);
  });

  it('replace-all: deletes old entry_tags, then links new normalized tags', () => {
    testDb.insert(schema.entries).values({ title: 'Entry', body: '' }).run();
    testDb.insert(schema.tags).values({ name: 'old-tag' }).run();
    testDb.insert(schema.entryTags).values({ entryId: 1, tagId: 1 }).run();

    // Simulate setEntryTags replace-all: clear existing
    testDb.delete(schema.entryTags).where(eq(schema.entryTags.entryId, 1)).run();

    // Add new tags
    const newTagNames = ['alpha', 'beta'];
    for (const name of newTagNames) {
      testDb.insert(schema.tags).values({ name }).onConflictDoNothing().run();
      const tag = testDb
        .select({ id: schema.tags.id })
        .from(schema.tags)
        .where(eq(schema.tags.name, name))
        .all()[0];
      testDb.insert(schema.entryTags).values({ entryId: 1, tagId: tag.id }).onConflictDoNothing().run();
    }

    // Verify new entry_tags (no old-tag, has alpha + beta)
    const linked = testDb
      .select({ name: schema.tags.name })
      .from(schema.entryTags)
      .leftJoin(schema.tags, eq(schema.entryTags.tagId, schema.tags.id))
      .where(eq(schema.entryTags.entryId, 1))
      .all();

    expect(linked.map(r => r.name).sort()).toEqual(['alpha', 'beta']);
  });
});
