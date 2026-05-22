'use server';

// src/lib/actions.ts
// Server Actions module — all DB mutations and queries go here.
// Pattern: import db + schema, use Drizzle queries, call revalidatePath after mutations.
// Source: Next.js Server Actions docs (vercel/next.js)

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { entries } from '@/lib/db/schema';

// Stub — returns all entries; Phase 2 adds ordering and snippet
export async function getEntries() {
  return db.select().from(entries).all();
}
