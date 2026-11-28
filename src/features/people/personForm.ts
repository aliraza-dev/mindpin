// Editing a person (R3.12). Only MindPin's own copy changes: nothing here can reach the
// phone's address book. The limits are the ones in design.md, "Limits on typed text".
import { updatePerson, type Person } from '../../db/people';
import type { SqlDatabase } from '../../db/types';

export const PERSON_LIMITS = {
  name: 100,
  phone: 20,
  phoneMinDigits: 3,
  phoneMaxDigits: 15,
} as const;

export type PersonFormValues = { name: string; phone: string };
export type PersonFormErrors = { name?: 'nameRequired' | 'nameTooLong'; phone?: 'phoneInvalid' };
export type PersonEdit = { name: string; phone: string | null };

export type PersonFormResult =
  { ok: true; value: PersonEdit } | { ok: false; errors: PersonFormErrors };

// Digits, spaces, dashes, and brackets, with an optional + at the very start. Anything else,
// such as the pause and code characters a dialer understands, is refused.
const PHONE_SHAPE = /^\+?[0-9 ()-]+$/;

function isPhone(phone: string): boolean {
  if (phone.length > PERSON_LIMITS.phone || !PHONE_SHAPE.test(phone)) return false;
  const digits = phone.replace(/\D/g, '').length;
  return digits >= PERSON_LIMITS.phoneMinDigits && digits <= PERSON_LIMITS.phoneMaxDigits;
}

export function validatePersonForm(values: PersonFormValues): PersonFormResult {
  const name = values.name.replace(/\s+/g, ' ').trim();
  const phone = values.phone.replace(/\s+/g, ' ').trim();
  const errors: PersonFormErrors = {};

  if (!name) errors.name = 'nameRequired';
  else if (name.length > PERSON_LIMITS.name) errors.name = 'nameTooLong';
  if (phone && !isPhone(phone)) errors.phone = 'phoneInvalid';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, phone: phone || null } };
}

export type EditPersonResult =
  { ok: true; person: Person } | { ok: false; errors: PersonFormErrors };

// Checks the form again and writes it. The link to the phone contact, if any, is kept.
export async function saveEditedPerson(
  db: SqlDatabase,
  personId: string,
  values: PersonFormValues,
): Promise<EditPersonResult> {
  const checked = validatePersonForm(values);
  if (!checked.ok) return checked;
  return { ok: true, person: await updatePerson(db, personId, checked.value) };
}
