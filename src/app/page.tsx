// src/app/page.tsx
// Home page — async Server Component. Shows entries filtered by search and/or tag.
// No 'use client' directive — must remain a Server Component so DB import
// chain runs only server-side.
import { Suspense } from 'react';
import { searchEntries } from '@/lib/actions';
import EntryCard from '@/components/entry-card';
import SearchInput from '@/components/search-input';
import ActiveFilterChip from '@/components/active-filter-chip';

function truncateQ(s: string): string {
  return s.length > 40 ? s.slice(0, 40) + '…' : s;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const entries = await searchEntries(q ?? null, tag ?? null);
  const isFiltered = Boolean(q || tag);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <Suspense fallback={null}>
        <SearchInput defaultValue={q ?? ''} />
      </Suspense>

      {isFiltered && (
        <p
          className="mt-3 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {entries.length === 1 ? '1 entry' : `${entries.length} entries`}
        </p>
      )}

      {tag && <ActiveFilterChip tag={tag} currentQ={q} />}

      {entries.length === 0 && isFiltered && (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm font-medium">No entries found</p>
          <p className="mt-1 text-zinc-400 text-xs">
            {q && tag ? (
              <>
                No entries match &ldquo;{truncateQ(q)}&rdquo; tagged &ldquo;{tag}&rdquo;.{' '}
                <a href="/" className="underline hover:text-zinc-600">
                  Clear the search or filter
                </a>{' '}
                to see all entries.
              </>
            ) : q ? (
              <>
                No entries match &ldquo;{truncateQ(q)}&rdquo;. Try a different keyword or{' '}
                <a
                  href={tag ? `/?tag=${encodeURIComponent(tag)}` : '/'}
                  className="underline hover:text-zinc-600"
                >
                  clear the search
                </a>
                .
              </>
            ) : (
              <>
                No entries tagged &ldquo;{tag}&rdquo;. Try a different tag or{' '}
                <a
                  href={q ? `/?q=${encodeURIComponent(q)}` : '/'}
                  className="underline hover:text-zinc-600"
                >
                  clear the filter
                </a>
                .
              </>
            )}
          </p>
        </div>
      )}

      {entries.length === 0 && !isFiltered && (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm">No entries yet.</p>
          <p className="mt-1 text-zinc-400 text-xs">
            Your journal is empty. Entries you write will appear here.
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="divide-y divide-zinc-200 mt-6">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </main>
  );
}
