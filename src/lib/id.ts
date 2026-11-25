import { randomUUID } from 'expo-crypto';

// UUID primary keys (design.md data model).
export function newId(): string {
  return randomUUID();
}
