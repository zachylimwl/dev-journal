// src/components/tag-chip.tsx
// Inline tag pill component — non-interactive in Phase 2.
// Phase 4 will add filter behavior.
interface Props {
  name: string;
}

export default function TagChip({ name }: Props) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
      {name}
    </span>
  );
}
