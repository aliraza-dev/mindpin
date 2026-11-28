// "Did you visit?" after Navigate (R5.2). MindPin does not track location, so it asks.
// Only the latest Navigate is remembered, and the question waits at least 15 minutes, so
// coming straight back to read a gate code does not trigger it.
import { getMemory, type Memory } from '../../db/memories';
import { deleteSetting, getSetting, setSetting } from '../../db/settings';
import { inTransaction } from '../../db/transaction';
import type { SqlDatabase } from '../../db/types';
import type { Visit } from '../../db/visits';
import { recordVisit } from './lastVisited';

const ASK_AFTER_MS = 15 * 60_000;

type Pending = { placeId: string; at: number };

export type NavigatePrompt = { place: Memory; navigatedAt: number };

async function readPending(db: SqlDatabase): Promise<Pending | null> {
  const raw = await getSetting(db, 'pending_navigate');
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Pending>;
    if (typeof value.placeId === 'string' && typeof value.at === 'number') {
      return { placeId: value.placeId, at: value.at };
    }
  } catch {
    // Unreadable: treated as nothing pending.
  }
  return null;
}

async function savedPlace(db: SqlDatabase, placeId: string): Promise<Memory | null> {
  const place = await getMemory(db, placeId);
  return place && place.type === 'place' && place.deletedAt === null ? place : null;
}

// Call when the user taps Navigate on a place.
export async function rememberNavigate(
  db: SqlDatabase,
  placeId: string,
  at: number = Date.now(),
): Promise<void> {
  const pending: Pending = { placeId, at };
  await setSetting(db, 'pending_navigate', JSON.stringify(pending));
}

// Call when the app opens. Returns the place to ask about, or null when there is nothing to ask
// yet. A question about a place that no longer exists is dropped.
export async function getNavigatePrompt(
  db: SqlDatabase,
  now: number = Date.now(),
): Promise<NavigatePrompt | null> {
  const pending = await readPending(db);
  if (!pending) return null;
  const place = await savedPlace(db, pending.placeId);
  if (!place) {
    await deleteSetting(db, 'pending_navigate');
    return null;
  }
  if (now - pending.at < ASK_AFTER_MS) return null;
  return { place, navigatedAt: pending.at };
}

// Call with the user's answer. Yes records the visit at the time of Navigate; either answer
// means the question is not asked again. Returns the recorded visit, or null.
export async function answerNavigatePrompt(
  db: SqlDatabase,
  visited: boolean,
): Promise<Visit | null> {
  const pending = await readPending(db);
  if (!pending) return null;
  return inTransaction(db, async () => {
    await deleteSetting(db, 'pending_navigate');
    if (!visited || !(await savedPlace(db, pending.placeId))) return null;
    return recordVisit(db, pending.placeId, { source: 'navigate_confirm', visitedAt: pending.at });
  });
}
