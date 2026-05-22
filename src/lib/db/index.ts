// src/lib/db/index.ts
// globalThis DB singleton + schema auto-init with FTS5 and triggers
// Source: Next.js HMR singleton pattern, better-sqlite3 API docs, SQLite FTS5 official docs

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function initSchema(sqlite: Database.Database): void {
  sqlite.exec(`
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
        INSERT INTO entries_fts(rowid, title, body)
          VALUES (new.id, new.title, new.body);
      END;

    CREATE TRIGGER IF NOT EXISTS entries_fts_update
      AFTER UPDATE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, body)
          VALUES ('delete', old.id, old.title, old.body);
        INSERT INTO entries_fts(rowid, title, body)
          VALUES (new.id, new.title, new.body);
      END;

    CREATE TRIGGER IF NOT EXISTS entries_fts_delete
      AFTER DELETE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, body)
          VALUES ('delete', old.id, old.title, old.body);
      END;
  `);
}

function getDb(): Database.Database {
  if (!globalThis.__db) {
    const dbPath = path.join(process.cwd(), '.data', 'journal.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    initSchema(sqlite);
    globalThis.__db = sqlite;
  }
  return globalThis.__db;
}

export const db = drizzle(getDb(), { schema });
