import type { Migration } from '../types';
import { migration001 } from './001_initial';
import { migration002 } from './002_search_index';

// Every database change goes through a migration (constitution III). Append new ones here.
export const migrations: Migration[] = [migration001, migration002];
