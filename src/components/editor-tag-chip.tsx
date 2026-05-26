// src/components/editor-tag-chip.tsx
// Presentational chip with a × remove button for use in EditorForm.
// No 'use client' needed — no hooks. onRemove is passed as a prop from EditorForm.
interface Props {
  name: string;
  onRemove: () => void;
}

export default function EditorTagChip({ name, onRemove }: Props) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
      {name}
      <button
        type="button"
        onClick={onRemove}
        className="ml-1.5 p-1 -m-1 text-zinc-400 hover:text-zinc-700 cursor-pointer leading-none"
        aria-label={`Remove tag ${name}`}
      >
        &times;
      </button>
    </span>
  );
}
