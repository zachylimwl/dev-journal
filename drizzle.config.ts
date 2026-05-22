// drizzle.config.ts
// Configuration for drizzle-kit CLI (schema push workflow)
// Source: orm.drizzle.team/docs/drizzle-kit-push, orm.drizzle.team/kit-docs/config-reference

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema:  './src/lib/db/schema.ts',
  dbCredentials: {
    url: '.data/journal.db',
  },
  // Exclude FTS5 virtual table and its internal shadow tables from drizzle-kit management.
  // FTS5 creates entries_fts_data, entries_fts_idx, entries_fts_content, etc.
  // These are created by initSchema() in db/index.ts and must not be touched by drizzle-kit.
  tablesFilter: ['!entries_fts', '!entries_fts_*'],
});
