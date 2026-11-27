import { randomUUID } from 'expo-crypto';

// UUID primary keys (design.md data model).
export function newId(): string {
  return randomUUID();
}

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// True only for a well-formed id. Screen addresses can be opened from outside the app, so every
// id taken from one is checked with this before it is used (design.md, Security rules).
export function isId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}
