import type { Migration } from '../types';
import { migration001 } from './001_initial';
import { migration002 } from './002_search_index';
import { migration003 } from './003_pending_geocode';
import { migration004 } from './004_person_color';

// Every database change goes through a migration (constitution III). Append new ones here.
export const migrations: Migration[] = [migration001, migration002, migration003, migration004];
