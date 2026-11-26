// Deciding who a place belongs to (R3.3, R3.7, R3.8, R3.11).
import {
  createPerson,
  findPersonByContactRef,
  getPerson,
  listRecentlyUsedPeople,
  type Person,
} from '../../db/people';
import type { SqlDatabase } from '../../db/types';
import type { DeviceContact } from './types';

const RECENT_PEOPLE_LIMIT = 3;

// Shown in the "Whose place is this?" field before the user types (R3.3).
export function recentPeople(db: SqlDatabase): Promise<Person[]> {
  return listRecentlyUsedPeople(db, RECENT_PEOPLE_LIMIT);
}

export type PersonSuggestion =
  | { kind: 'person'; person: Person; exactName: boolean }
  | { kind: 'contact'; contact: DeviceContact };

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

const WORD_BREAK = /[\s\-_.,()'"/]/;

// True when the query appears at the start of the name or of any word in it.
function matchesWordStart(name: string, query: string): boolean {
  let from = 0;
  for (;;) {
    const at = name.indexOf(query, from);
    if (at === -1) return false;
    if (at === 0 || WORD_BREAK.test(name[at - 1])) return true;
    from = at + 1;
  }
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

// Suggestions while typing. People already in MindPin come first, an exact name match
// (ignoring case) at the top, so the user can pick them instead of making a duplicate (R3.8).
// A device contact that is already linked to a person is shown as that person (R3.7).
// Pure and in memory, so it stays well inside the 300 ms budget of R3.2.
export function suggestPeople(
  typed: string,
  people: Person[],
  contacts: DeviceContact[],
  limit = 8,
): PersonSuggestion[] {
  const query = normalize(typed);
  if (!query) return [];

  const linked = new Map<string, Person>();
  for (const person of people) {
    if (person.contactRef) linked.set(person.contactRef, person);
  }

  const exact: Person[] = [];
  const partial: Person[] = [];
  const shown = new Set<string>();
  for (const person of people) {
    const name = normalize(person.name);
    if (name === query) exact.push(person);
    else if (matchesWordStart(name, query)) partial.push(person);
    else continue;
    shown.add(person.id);
  }

  const unlinked: DeviceContact[] = [];
  for (const contact of contacts) {
    if (!matchesWordStart(normalize(contact.name), query)) continue;
    const person = linked.get(contact.contactRef);
    if (!person) unlinked.push(contact);
    else if (!shown.has(person.id)) {
      partial.push(person);
      shown.add(person.id);
    }
  }

  return [
    ...exact.sort(byName).map((person) => ({ kind: 'person' as const, person, exactName: true })),
    ...partial.sort(byName).map((person) => ({ kind: 'person' as const, person, exactName: false })),
    ...unlinked.sort(byName).map((contact) => ({ kind: 'contact' as const, contact })),
  ].slice(0, limit);
}

// What the user chose in the "Whose place is this?" field.
export type PersonChoice =
  | { kind: 'existing'; personId: string }
  | { kind: 'contact'; contact: DeviceContact }
  // A typed name. Always a new person: people are never merged automatically (R3.8).
  | { kind: 'new'; name: string }
  // A place can be saved without a person (R3.11).
  | { kind: 'none' };

// Turns the choice into a stored person, creating one only when needed. Call it inside the
// save transaction so a failed save leaves no stray person behind.
export async function resolvePersonChoice(
  db: SqlDatabase,
  choice: PersonChoice,
): Promise<Person | null> {
  switch (choice.kind) {
    case 'none':
      return null;
    case 'existing': {
      const person = await getPerson(db, choice.personId);
      if (!person) throw new Error('Person not found');
      return person;
    }
    case 'contact': {
      const { contactRef, name, phone, photoUri } = choice.contact;
      const existing = await findPersonByContactRef(db, contactRef);
      return existing ?? createPerson(db, { name, phone, contactRef, photoUri });
    }
    case 'new':
      return createPerson(db, { name: choice.name });
  }
}
