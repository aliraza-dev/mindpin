// Full-text search over everything saved (R6.1). It reads only the on-device index, so it works
// with no connection (R6.4), and it is meant to run on every keystroke (R6.2).
import { toMemory, type Memory, type MemoryRow } from './memories';
import type { SqlDatabase } from './types';

export type SearchResult = { memory: Memory; personName: string | null };

const DEFAULT_LIMIT = 50;

// A word needs at least one letter or digit to be searchable. Non-ASCII characters are let
// through for the index's own tokenizer to judge; a word it finds empty simply matches nothing.
const SEARCHABLE = /[0-9a-z]|[^\u0000-\u007f]/i;

// Turns typed text into a query for the index: every word must match, and each word matches
// from its start, so results appear while a word is still being typed. Words are quoted, so
// characters and words that are search operators (quotes, *, AND, NEAR, column:) are plain text.
export function buildMatchQuery(text: string): string | null {
  const terms = text
    .split(/\s+/)
    .filter((word) => SEARCHABLE.test(word))
    .map((word) => `"${word.replace(/"/g, '""')}"*`);
  return terms.length > 0 ? terms.join(' ') : null;
}

// Best matches first. A match on the person's name or the label counts for more than one in the
// address, tags, or notes; ties go to the most recently changed.
export async function searchMemories(
  db: SqlDatabase,
  text: string,
  limit: number = DEFAULT_LIMIT,
): Promise<SearchResult[]> {
  const match = buildMatchQuery(text);
  if (!match) return [];
  const rows = await db.getAllAsync<MemoryRow & { person_name: string | null }>(
    `SELECT m.*, p.name AS person_name
     FROM memory_fts
     JOIN memory m ON m.id = memory_fts.memory_id
     LEFT JOIN person p ON p.id = m.person_id
     WHERE memory_fts MATCH ? AND m.deleted_at IS NULL
     ORDER BY bm25(memory_fts, 0.0, 10.0, 8.0, 4.0, 2.0, 3.0), m.updated_at DESC
     LIMIT ?`,
    [match, limit],
  );
  return rows.map((row) => ({ memory: toMemory(row), personName: row.person_name }));
}
