// src/components/app-header.tsx
// Persistent app header — slotted in layout.tsx so all pages inherit it.
// Right-side slot is a placeholder for Phase 3 "New Entry" button (D-10).
import Link from 'next/link';

export default function AppHeader() {
  return (
    <header className="border-b border-zinc-200">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-semibold text-zinc-900 no-underline">
          Dev Journal
        </Link>
        {/* Right slot — Phase 3 adds "New Entry" button here */}
        <div />
      </div>
    </header>
  );
}
