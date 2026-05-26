// src/lib/utils/format.ts
// Pure utility functions for snippet generation and date formatting.
// No external dependencies — runs in Server Actions and Server Components.

export function generateSnippet(body: string, maxLen = 300): string {
  const stripped = body
    .replace(/[#*_`\[\]()>|]/g, '')   // headings, bold, italic, code, links, blockquotes, tables
    .replace(/^-\s+/gm, '')            // list markers at line start
    .replace(/\s+/g, ' ')              // collapse whitespace
    .trim();

  if (stripped.length <= maxLen) return stripped;

  const cut = stripped.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
}

export function formatEntryDate(createdAt: Date, now: Date = new Date()): string {
  if (!(createdAt instanceof Date) || isNaN(createdAt.getTime())) {
    return 'Unknown date';
  }
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const absolute = createdAt.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  if (diffDays < 0) return `${absolute}`; // future date — show absolute only
  if (diffDays === 0) return `Today — ${absolute}`;
  if (diffDays === 1) return `Yesterday — ${absolute}`;
  return `${diffDays} days ago — ${absolute}`;
}
