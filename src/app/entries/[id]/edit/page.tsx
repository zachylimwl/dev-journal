// src/app/entries/[id]/edit/page.tsx
// Server Component wrapper for the /entries/[id]/edit route.
// Fetches existing entry data at render time and passes to EditorForm.
// params is a Promise in Next.js 16 — must await before accessing id.
import { notFound } from 'next/navigation';
import { getEntryById } from '@/lib/actions';
import EditorForm from '@/components/editor-form';

type Props = { params: Promise<{ id: string }> };

export default async function EditEntryPage({ params }: Props) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) notFound();
  const entry = await getEntryById(numericId);

  if (!entry) return notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <EditorForm initialEntry={entry} mode="edit" />
    </main>
  );
}
