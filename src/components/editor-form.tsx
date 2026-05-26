'use client';

// src/components/editor-form.tsx
// Shared Client Component for /new and /entries/[id]/edit.
// Handles autosave debounce, tag chip zone, and MDEditor dynamic import.

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { EntryDetail } from '@/lib/actions';
import { createEntry, updateEntry, setEntryTags } from '@/lib/actions';
import EditorTagChip from '@/components/editor-tag-chip';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

// CSS imports above MUST be here in the Client Component, NOT in globals.css
// This prevents MDEditor styles from bleeding into the detail-page prose view.
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface Props {
  initialEntry?: EntryDetail;
  mode: 'new' | 'edit';
}

export default function EditorForm({ initialEntry, mode }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialEntry?.title ?? '');
  const [body, setBody] = useState(initialEntry?.body ?? '');
  const [chipTags, setChipTags] = useState<string[]>(initialEntry?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Refs — avoid stale closures on fast typing
  const entryIdRef = useRef<number | null>(initialEntry?.id ?? null);
  const isSavingRef = useRef(false); // Race condition guard (prevents concurrent saves)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutosave = useCallback(
    (t: string, b: string, tags: string[]) => {
      if (isSavingRef.current) return; // Skip if save already in flight
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        if (!t.trim() && !b.trim()) return; // D-03 orphan guard — skip if both empty

        isSavingRef.current = true;
        setSaveStatus('saving');
        try {
          if (entryIdRef.current === null) {
            // First save — create entry and redirect to edit URL
            const { id } = await createEntry(t, b);
            entryIdRef.current = id;
            await setEntryTags(id, tags);
            router.replace(`/entries/${id}/edit`);
          } else {
            // Subsequent saves — update in place
            await updateEntry(entryIdRef.current, t, b);
            await setEntryTags(entryIdRef.current, tags);
          }
          setSaveStatus('saved');
          if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
        } catch {
          // Autosave silently recovers — user can keep typing
          setSaveStatus('idle');
        } finally {
          isSavingRef.current = false;
        }
      }, 500);
    },
    [router],
  );

  function addTag() {
    const raw = tagInput.trim();
    const normalized = raw.toLowerCase();
    if (!normalized || chipTags.includes(normalized)) {
      setTagInput('');
      return;
    }
    const updated = [...chipTags, normalized];
    setChipTags(updated);
    setTagInput('');
    triggerAutosave(title, body, updated);
  }

  return (
    <>
      {/* Header row: back link + autosave status */}
      <div className="flex items-center justify-between mb-4">
        {mode === 'new' ? (
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← All entries
          </Link>
        ) : (
          <Link
            href={`/entries/${entryIdRef.current}`}
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            ← Back to entry
          </Link>
        )}
        <span
          className={`text-xs transition-opacity duration-500 ${
            saveStatus === 'idle' ? 'opacity-0 text-zinc-300' : 'opacity-100 text-zinc-500'
          }`}
        >
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved just now' : ' '}
        </span>
      </div>

      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          triggerAutosave(e.target.value, body, chipTags);
        }}
        placeholder="Entry title"
        className="w-full text-2xl font-semibold text-zinc-900 placeholder:text-zinc-300 border-0 border-b border-zinc-200 focus:border-zinc-400 focus:outline-none pb-2 mb-4 bg-transparent"
      />

      {/* Tag zone */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {chipTags.map((tag) => (
          <EditorTagChip
            key={tag}
            name={tag}
            onRemove={() => {
              const updated = chipTags.filter((t) => t !== tag);
              setChipTags(updated);
              triggerAutosave(title, body, updated);
            }}
          />
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="Add tag…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag();
            }
          }}
          className="text-sm text-zinc-700 placeholder:text-zinc-400 border-0 focus:outline-none bg-transparent min-w-[120px]"
        />
      </div>

      {/* MDEditor — wrapped in data-color-mode="light" to prevent dark background on system dark mode */}
      <div data-color-mode="light">
        <MDEditor
          value={body}
          onChange={(val) => {
            setBody(val ?? '');
            triggerAutosave(title, val ?? '', chipTags);
          }}
          height={500}
        />
      </div>
    </>
  );
}
