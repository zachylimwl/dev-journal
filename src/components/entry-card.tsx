// src/components/entry-card.tsx
// Entry list row — title + date + snippet + tag chips, wrapped in a Link.
// No border on the card itself — divider comes from parent divide-y (D-04).
// No 'use client' directive — Server Component.
import type { EntryListItem } from '@/lib/actions';
import Link from 'next/link';
import TagChip from '@/components/tag-chip';

interface Props {
  entry: EntryListItem;
}

export default function EntryCard({ entry }: Props) {
  return (
    <article className="py-5">
      <Link href={`/entries/${entry.id}`} className="group block">
        <h2 className="text-lg font-semibold text-zinc-900 group-hover:underline">
          {entry.title}
        </h2>
      </Link>
      <p className="mt-1 text-xs text-zinc-400">{entry.dateLabel}</p>
      {entry.snippet && (
        <p className="mt-2 text-sm text-zinc-600 line-clamp-3">{entry.snippet}</p>
      )}
      {entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <TagChip key={tag} name={tag} />
          ))}
        </div>
      )}
    </article>
  );
}
