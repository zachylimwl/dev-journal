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
