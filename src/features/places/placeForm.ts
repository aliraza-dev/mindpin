// What the edit form accepts for a place (R4.1, R4.2, R4.10). Pure: no database, no screen.
// The limits are the ones in design.md, "Limits on typed text".

export const PLACE_LIMITS = { label: 40, address: 300, notes: 2000, tags: 10, tag: 40 } as const;

// The ready-made labels, in the order the save sheet shows them (R4.1). They are stored as
// written here; any other label is a custom one.
export const PRESET_LABELS = ['Home', 'Shop', 'Office'] as const;
export type PresetLabel = (typeof PRESET_LABELS)[number];
export type LabelChoice = PresetLabel | 'custom';

// The form as typed. Tags are typed in one field, separated by commas.
export type PlaceFormValues = { label: string; address: string; notes: string; tagsText: string };

export type PlaceFormField = 'label' | 'address' | 'notes' | 'tags';
export type PlaceFormError =
  | 'labelRequired'
  | 'labelTooLong'
  | 'addressRequired'
  | 'addressTooLong'
  | 'notesTooLong'
  | 'tooManyTags'
  | 'tagTooLong';
export type PlaceFormErrors = Partial<Record<PlaceFormField, PlaceFormError>>;

// What is written to the database once the form is accepted.
export type PlaceEdit = {
  title: string;
  address: string | null;
  notes: string | null;
  tags: string[];
};

export type PlaceFormResult =
  { ok: true; value: PlaceEdit } | { ok: false; errors: PlaceFormErrors };

export function labelChoice(label: string): LabelChoice {
  const key = label.trim().toLowerCase();
  return PRESET_LABELS.find((preset) => preset.toLowerCase() === key) ?? 'custom';
}

// Tags as typed: separated by commas or new lines. Repeats are dropped, ignoring letter case.
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of text.split(/[,\n]/)) {
    const tag = part.replace(/\s+/g, ' ').trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

export function tagsToText(tags: string[]): string {
  return tags.join(', ');
}

type Options = {
  // A place with no pin is found by its address, so the address cannot be emptied (R4.10).
  hasPin: boolean;
};

export function validatePlaceForm(values: PlaceFormValues, { hasPin }: Options): PlaceFormResult {
  const title = values.label.trim();
  const address = values.address.trim();
  const notes = values.notes.trim();
  const tags = parseTags(values.tagsText);
  const errors: PlaceFormErrors = {};

  if (!title) errors.label = 'labelRequired';
  else if (title.length > PLACE_LIMITS.label) errors.label = 'labelTooLong';

  if (!address && !hasPin) errors.address = 'addressRequired';
  else if (address.length > PLACE_LIMITS.address) errors.address = 'addressTooLong';

  if (notes.length > PLACE_LIMITS.notes) errors.notes = 'notesTooLong';

  if (tags.length > PLACE_LIMITS.tags) errors.tags = 'tooManyTags';
  else if (tags.some((tag) => tag.length > PLACE_LIMITS.tag)) errors.tags = 'tagTooLong';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { title, address: address || null, notes: notes || null, tags } };
}
