'use server';

// src/lib/actions.ts
// Server Actions module — all DB mutations and queries go here.
// Pattern: import db + schema, use Drizzle queries, call revalidatePath after mutations.
// Source: Next.js Server Actions docs (vercel/next.js)

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { entries, tags, entryTags } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { generateSnippet, formatEntryDate } from '@/lib/utils/format';

export type EntryListItem = {
  id: number;
  title: string;
  snippet: string;
  dateLabel: string;
  tags: string[];
};

export type EntryDetail = {
  id: number;
  title: string;
  body: string;
  dateLabel: string;
  tags: string[];
};

export async function getEntries(): Promise<EntryListItem[]> {
  const rows = db
    .select({
      id:        entries.id,
      title:     entries.title,
      body:      entries.body,
      createdAt: entries.createdAt,
      tagName:   tags.name,
    })
    .from(entries)
    .leftJoin(entryTags, eq(entries.id, entryTags.entryId))
    .leftJoin(tags, eq(entryTags.tagId, tags.id))
    .orderBy(desc(entries.createdAt))
    .all();

  const now = new Date();
  const map = new Map<number, EntryListItem & { body: string; createdAt: Date }>();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id:        row.id,
        title:     row.title,
        body:      row.body,
        createdAt: row.createdAt,
        snippet:   generateSnippet(row.body),
        dateLabel: formatEntryDate(row.createdAt, now),
        tags:      [],
      });
    }
    if (row.tagName) map.get(row.id)!.tags.push(row.tagName);
  }
  return Array.from(map.values()).map(({ body: _body, createdAt: _ca, ...rest }) => rest);
}

export async function getEntryById(id: number): Promise<EntryDetail | null> {
  const rows = db
    .select({
      id:        entries.id,
      title:     entries.title,
      body:      entries.body,
      createdAt: entries.createdAt,
      tagName:   tags.name,
    })
    .from(entries)
    .leftJoin(entryTags, eq(entries.id, entryTags.entryId))
    .leftJoin(tags, eq(entryTags.tagId, tags.id))
    .where(eq(entries.id, id))
    .all();

  if (rows.length === 0) return null;

  const entry: EntryDetail = {
    id:        rows[0].id,
    title:     rows[0].title,
    body:      rows[0].body,
    dateLabel: formatEntryDate(rows[0].createdAt, new Date()),
    tags:      [],
  };
  for (const row of rows) {
    if (row.tagName) entry.tags.push(row.tagName);
  }
  return entry;
}

export async function createEntry(title: string, body: string): Promise<{ id: number }> {
  const result = db
    .insert(entries)
    .values({ title, body })
    .returning({ id: entries.id })
    .all();
  if (result.length === 0) throw new Error('createEntry: insert returned no rows');
  revalidatePath('/');
  return { id: result[0].id };
}

export async function updateEntry(id: number, title: string, body: string): Promise<void> {
  db.update(entries)
    .set({ title, body, updatedAt: new Date() })
    .where(eq(entries.id, id))
    .run();
  revalidatePath('/');
  revalidatePath(`/entries/${id}`);
}

export async function deleteEntry(id: number): Promise<void> {
  db.delete(entries).where(eq(entries.id, id)).run();
  revalidatePath('/');
  revalidatePath(`/entries/${id}`);
  revalidatePath(`/entries/${id}/edit`);
}

export async function setEntryTags(entryId: number, tagNames: string[]): Promise<void> {
  const normalized = [...new Set(tagNames.map(t => t.trim().toLowerCase()).filter(Boolean))];

  const replaceAll = db.$client.transaction(() => {
    db.$client.prepare('DELETE FROM entry_tags WHERE entry_id = ?').run(entryId);
    for (const name of normalized) {
      db.$client.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
      const tag = db.$client.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: number };
      if (!tag) throw new Error(`setEntryTags: tag "${name}" not found after upsert`);
      db.$client.prepare('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)').run(entryId, tag.id);
    }
  });
  replaceAll();

  revalidatePath('/');
  revalidatePath(`/entries/${entryId}`);
}

export async function searchEntries(
  q: string | null,
  tag: string | null
): Promise<EntryListItem[]> {
  // Sanitize q: strip FTS5 syntax operators to prevent parse errors.
  // Replace(/[^\w\s]/g, ' ') removes quotes, hyphens, parens, asterisks, etc.
  // After sanitization, check if there's any meaningful query left.
  const cleanQ = (q ?? '').replace(/[^\w\s]/g, ' ').trim();
  const hasQ = cleanQ.length > 0;
  const hasTag = (tag?.trim().length ?? 0) > 0;
  const now = new Date();

  // Helper: fetch tag rows for a set of entry IDs via raw SQL
  // Guards against empty IDs array (SQLite IN() with zero items is a syntax error)
  function fetchTagsForIds(ids: number[]): Array<{ entry_id: number; name: string }> {
    if (ids.length === 0) return [];
    return db.$client.prepare(`
      SELECT et.entry_id, t.name
      FROM entry_tags et
      JOIN tags t ON et.tag_id = t.id
      WHERE et.entry_id IN (${ids.map(() => '?').join(',')})
    `).all(...ids) as Array<{ entry_id: number; name: string }>;
  }

  // Helper: merge base rows + tag rows into EntryListItem[]
  // base rows come from raw SQL (created_at is INTEGER unix epoch seconds)
  function mergeToEntryList(
    baseRows: Array<{ id: number; title: string; body: string; created_at: number }>
  ): EntryListItem[] {
    const tagRows = fetchTagsForIds(baseRows.map(r => r.id));
    const tagMap = new Map<number, string[]>();
    for (const tr of tagRows) {
      if (!tagMap.has(tr.entry_id)) tagMap.set(tr.entry_id, []);
      tagMap.get(tr.entry_id)!.push(tr.name);
    }
    return baseRows.map(row => {
      const createdAt = new Date(row.created_at * 1000);
      return {
        id:        row.id,
        title:     row.title,
        snippet:   generateSnippet(row.body),
        dateLabel: formatEntryDate(createdAt, now),
        tags:      tagMap.get(row.id) ?? [],
      };
    });
  }

  // Case 1: no filters — delegate to getEntries() (no FTS5 call)
  if (!hasQ && !hasTag) {
    return getEntries();
  }

  // Case 2: tag only — raw SQL JOIN query, ORDER BY created_at DESC
  if (!hasQ && hasTag) {
    const baseRows = db.$client.prepare(`
      SELECT DISTINCT e.id, e.title, e.body, e.created_at
      FROM entries e
      JOIN entry_tags et ON e.id = et.entry_id
      JOIN tags t ON et.tag_id = t.id
      WHERE t.name = ?
      ORDER BY e.created_at DESC
      LIMIT 200
    `).all(tag!.trim()) as Array<{ id: number; title: string; body: string; created_at: number }>;
    return mergeToEntryList(baseRows);
  }

  // Case 3: keyword only — FTS5 MATCH, BM25 ranked
  if (hasQ && !hasTag) {
    const ftsRows = db.$client.prepare(`
      SELECT e.id, e.title, e.body, e.created_at
      FROM entries_fts
      JOIN entries e ON entries_fts.rowid = e.id
      WHERE entries_fts MATCH ?
      ORDER BY rank
      LIMIT 200
    `).all(cleanQ) as Array<{ id: number; title: string; body: string; created_at: number }>;
    return mergeToEntryList(ftsRows);
  }

  // Case 4: keyword + tag — FTS5 MATCH + tag JOIN
  // hasQ && hasTag
  const ftsTagRows = db.$client.prepare(`
    SELECT DISTINCT e.id, e.title, e.body, e.created_at
    FROM entries_fts
    JOIN entries e ON entries_fts.rowid = e.id
    JOIN entry_tags et ON e.id = et.entry_id
    JOIN tags t ON et.tag_id = t.id
    WHERE entries_fts MATCH ?
      AND t.name = ?
    ORDER BY rank
    LIMIT 200
  `).all(cleanQ, tag!.trim()) as Array<{ id: number; title: string; body: string; created_at: number }>;
  return mergeToEntryList(ftsTagRows);
}
