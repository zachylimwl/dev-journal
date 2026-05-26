// src/app/entries/[id]/page.tsx
// Entry detail page — async Server Component.
// No 'use client' directive — all data fetching is server-side.
// params is a Promise in Next.js 15+ (including 16); must await before accessing id.
// Number(id) coerces non-numeric strings to NaN; Drizzle returns null; notFound() fires.
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEntryById } from '@/lib/actions';
import MarkdownBody from '@/components/markdown-body';
import TagChip from '@/components/tag-chip';
import DeleteButton from '@/components/delete-button';

type Props = { params: Promise<{ id: string }> };

export default async function EntryPage({ params }: Props) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) notFound();
  const entry = await getEntryById(numericId);

  if (!entry) return notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← All entries
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-zinc-900">{entry.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">{entry.dateLabel}</p>
      {entry.tags.length > 0 && (
        <div className="mt-2 flex gap-2">
          {entry.tags.map((tag) => (
            <TagChip key={tag} name={tag} />
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-3">
        <Link
          href={`/entries/${entry.id}/edit`}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
        >
          Edit
        </Link>
        <DeleteButton entryId={entry.id} />
      </div>
      <MarkdownBody body={entry.body} className="mt-8" />
    </main>
  );
}
