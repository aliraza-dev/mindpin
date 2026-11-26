// Network step for short map links (R2.2). Kept apart from the pure parser (constitution V).
// Only known short map links are ever requested, and nothing about them is logged.
import { parseShared } from '../../parser/parseShared';

export type ResolveOutcome =
  | { kind: 'coordinates'; lat: number; lng: number }
  // The final link names a place but has no coordinates; the caller can look the name up.
  | { kind: 'text'; text: string }
  // The link is dead or leads nowhere useful; do not try again.
  | { kind: 'unresolvable' }
  // Offline, timed out, or the server is busy; try again on the next connection (R1.5).
  | { kind: 'retry' };

export type FetchLike = (
  url: string,
  init: { method: 'HEAD' | 'GET'; redirect: 'follow'; signal: AbortSignal },
) => Promise<{ url: string; status: number }>;

const DEFAULT_TIMEOUT_MS = 8000;

async function request(
  url: string,
  method: 'HEAD' | 'GET',
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<{ url: string; status: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { method, redirect: 'follow', signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function readFinalLink(finalUrl: string): ResolveOutcome | null {
  const parsed = parseShared(finalUrl);
  if (parsed.kind === 'coordinates') {
    return { kind: 'coordinates', lat: parsed.lat, lng: parsed.lng };
  }
  // For a lone link the parser only returns text when a map link names a place.
  if (parsed.kind === 'text') return parsed;
  return null;
}

export async function resolveShortLink(
  url: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ResolveOutcome> {
  const parsed = parseShared(url);
  if (parsed.kind !== 'needs_resolve') return { kind: 'unresolvable' };
  const target = parsed.url.replace(/^http:\/\//i, 'https://');

  // HEAD avoids downloading the map page; GET is the fallback when HEAD is refused or
  // does not report where the link leads.
  for (const method of ['HEAD', 'GET'] as const) {
    const response = await request(target, method, fetchImpl, timeoutMs);
    if (!response) return { kind: 'retry' };
    if (response.status === 429 || response.status >= 500) return { kind: 'retry' };
    if (response.status === 404 || response.status === 410) return { kind: 'unresolvable' };
    const outcome = readFinalLink(response.url);
    if (outcome) return outcome;
  }
  return { kind: 'unresolvable' };
}
