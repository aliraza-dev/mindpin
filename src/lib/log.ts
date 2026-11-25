// The only place allowed to print (enforced by ESLint's no-console rule elsewhere).
// Constitution II: never log addresses, coordinates, contact names, phone numbers, or note text.
// Only an event name and allow-listed, non-personal fields get through; there is no analytics.

type SafeValue = string | number | boolean;

const ALLOWED_FIELDS = new Set([
  'count',
  'durationMs',
  'errorCode',
  'ok',
  'screen',
  'source',
  'status',
  'type',
  'version',
]);

// Strings must look like an app-defined code, never free text.
const CODE_PATTERN = /^[a-z0-9_.-]{1,40}$/;
const EVENT_PATTERN = /^[a-z][a-z0-9_]{0,59}$/;

export function sanitizeFields(fields: Record<string, unknown>): Record<string, SafeValue> {
  const safe: Record<string, SafeValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === 'boolean') safe[key] = value;
    else if (typeof value === 'string' && CODE_PATTERN.test(value)) safe[key] = value;
  }
  return safe;
}

export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  if (!__DEV__ || !EVENT_PATTERN.test(event)) return;
  console.info('[mindpin]', event, sanitizeFields(fields));
}
