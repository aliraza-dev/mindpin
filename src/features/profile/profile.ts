// The user's own profile: for now the first name used in Home's greeting (R7.8), and how much
// they have saved. Everything stays on the phone. Sign-in and backup arrive with their own
// tasks.
import { listNotes } from '../../db/memories';
import { listPeople } from '../../db/people';
import { listPlaceSummaries } from '../../db/placeSummaries';
import { deleteSetting, getSetting, setSetting } from '../../db/settings';
import type { SqlDatabase } from '../../db/types';

// A first name longer than this is refused (design.md: limits on typed text).
export const FIRST_NAME_LIMIT = 50;

export type Profile = { firstName: string | null; people: number; places: number; notes: number };

export async function loadProfile(db: SqlDatabase): Promise<Profile> {
  const [firstName, people, places, notes] = await Promise.all([
    getSetting(db, 'user_first_name'),
    listPeople(db),
    listPlaceSummaries(db),
    listNotes(db),
  ]);
  return { firstName, people: people.length, places: places.length, notes: notes.length };
}

export type NameResult = { ok: true; firstName: string | null } | { ok: false; error: 'tooLong' };

// Tidies the typed name: spaces at the ends go, and runs of spaces become one.
export function cleanFirstName(typed: string): NameResult {
  const name = typed.replace(/\s+/g, ' ').trim();
  if (name.length > FIRST_NAME_LIMIT) return { ok: false, error: 'tooLong' };
  return { ok: true, firstName: name || null };
}

// Stores the name. An empty name removes it, and Home's greeting then leaves the name out.
export async function saveFirstName(db: SqlDatabase, typed: string): Promise<NameResult> {
  const checked = cleanFirstName(typed);
  if (!checked.ok) return checked;
  if (checked.firstName === null) await deleteSetting(db, 'user_first_name');
  else await setSetting(db, 'user_first_name', checked.firstName);
  return checked;
}
