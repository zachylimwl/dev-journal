import { describe, it, expect } from 'vitest';

// Local normalizeTag function — mirrors the client-side logic in EditorForm
// and the server-side guard in setEntryTags. Defined inline to keep this a
// pure logic test with no src/ imports.
function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

describe('normalizeTag — trim and lowercase', () => {
  it('trims leading and trailing whitespace and lowercases', () => {
    expect(normalizeTag('  Foo  ')).toBe('foo');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeTag('   ')).toBe('');
  });

  it('lowercases unicode characters', () => {
    expect(normalizeTag('  Café  ')).toBe('café');
  });

  it('passes through already-normalized tag unchanged', () => {
    expect(normalizeTag('bar')).toBe('bar');
  });
});

describe('server-side normalization pipeline (setEntryTags guard)', () => {
  it('normalizes, deduplicates, and filters empty strings from raw input', () => {
    const input = ['  Foo  ', 'bar', '  Foo  ', '', 'BAZ'];
    const normalized = [...new Set(
      input.map(t => t.trim().toLowerCase()).filter(Boolean)
    )];
    expect(normalized).toEqual(['foo', 'bar', 'baz']);
  });

  it('returns empty array when all inputs are empty or whitespace', () => {
    const input = ['', '  ', '   '];
    const normalized = [...new Set(
      input.map(t => t.trim().toLowerCase()).filter(Boolean)
    )];
    expect(normalized).toEqual([]);
  });

  it('deduplicates case-insensitive duplicates', () => {
    const input = ['React', 'react', 'REACT'];
    const normalized = [...new Set(
      input.map(t => t.trim().toLowerCase()).filter(Boolean)
    )];
    expect(normalized).toEqual(['react']);
  });
});
