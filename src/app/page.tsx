// src/app/page.tsx
// Home page — async Server Component. Shows all entries newest-first.
// No 'use client' directive — must remain a Server Component so DB import
// chain runs only server-side.
import { getEntries } from '@/lib/actions';
import EntryCard from '@/components/entry-card';

export default async function Home() {
  const entries = await getEntries();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {entries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm">No entries yet.</p>
          <p className="mt-1 text-zinc-400 text-xs">
            Your journal is empty. Entries you write will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </main>
  );
}
