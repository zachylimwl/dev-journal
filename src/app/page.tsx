// src/app/page.tsx
// Home page — async Server Component.
// Imports getEntries from @/lib/actions, triggering the DB auto-creation import chain:
//   page.tsx → actions.ts → db/index.ts → .data/journal.db
// No 'use client' directive — must remain a Server Component so the DB import chain
// runs only server-side. Phase 2 will add full entry list layout.

import { getEntries } from '@/lib/actions';

export default async function Home() {
  const entries = await getEntries();

  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold">Dev Journal</h1>
      <p className="mt-4 text-zinc-600">
        {entries.length === 0 ? '0 entries' : `${entries.length} entries`}
      </p>
    </main>
  );
}
