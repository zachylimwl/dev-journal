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
});
