// src/lib/db/schema.ts
// Drizzle ORM table definitions for the Dev Journal
// Source: orm.drizzle.team/docs/column-types/sqlite

import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const entries = sqliteTable('entries', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  title:     text('title').notNull().default(''),
  body:      text('body').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
               .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
               .$defaultFn(() => new Date()),
});

export const tags = sqliteTable('tags', {
  id:   integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

// Junction table — entryId + tagId form the composite key
// FTS5 virtual table (entries_fts) is NOT defined here —
// Drizzle has no native type for virtual tables.
// It is created exclusively via raw SQL in initSchema() in db/index.ts.
export const entryTags = sqliteTable('entry_tags', {
  entryId: integer('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  tagId:   integer('tag_id').notNull().references(() => tags.id,    { onDelete: 'cascade' }),
});
