import type { Migration } from '../types';

// Adds the color a person can be given (design.md: person.color). Null means no choice was
// made, and the app picks a tint itself.
export const migration004: Migration = {
  version: 4,
  name: 'person color',
  sql: `
    ALTER TABLE person ADD COLUMN color TEXT;
  `,
};
