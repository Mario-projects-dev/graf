// Helpers for resilient + cached data loading.
//
// safeAsync(fn, fallback): never throws — returns fallback on error.
//   Lets useAsyncData prerender complete even when an external API is down at
//   build time. Page UI then checks `data === fallback` to show error state.
//
// memoize(key, fn): module-level Promise dedupe.
//   Multiple components on the same page calling the same loader share one
//   in-flight Promise. Cleared after TTL_MS so subsequent visits refresh.

const TTL_MS = 5 * 60 * 1000; // 5 min — long enough to dedupe within a session
const memo = new Map<string, { promise: Promise<unknown>; expiresAt: number }>();

export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  label?: string
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (label) {
      // eslint-disable-next-line no-console
      console.warn(`[safeAsync] ${label} fallback used:`, e);
    }
    return fallback;
  }
}

export function memoize<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = memo.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.promise as Promise<T>;
  }
  const p = fn().catch((e) => {
    // Drop failed promise from cache so retry is possible.
    memo.delete(key);
    throw e;
  });
  memo.set(key, { promise: p, expiresAt: now + TTL_MS });
  return p;
}

export function clearMemo(prefix?: string) {
  if (!prefix) {
    memo.clear();
    return;
  }
  for (const k of memo.keys()) {
    if (k.startsWith(prefix)) memo.delete(k);
  }
}
