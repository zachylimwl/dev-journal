// src/app/new/page.tsx
// Server Component wrapper for the /new route.
// No data fetching needed — EditorForm handles creation via autosave.
import EditorForm from '@/components/editor-form';

export default function NewEntryPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <EditorForm mode="new" />
    </main>
  );
}
