type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const valueCache = new Map<string, CacheEntry>();
const inFlightCache = new Map<string, Promise<unknown>>();

function isExpired(entry: CacheEntry): boolean {
  return entry.expiresAt <= Date.now();
}

export async function getOrLoadCached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = valueCache.get(key);
  if (cached && !isExpired(cached)) {
    return cached.value as T;
  }
  if (cached && isExpired(cached)) {
    valueCache.delete(key);
  }

  const existingInFlight = inFlightCache.get(key);
  if (existingInFlight) {
    return existingInFlight as Promise<T>;
  }

  const pending = loader()
    .then((value) => {
      valueCache.set(key, {
        value,
        expiresAt: Date.now() + Math.max(0, ttlMs),
      });
      return value;
    })
    .finally(() => {
      inFlightCache.delete(key);
    });

  inFlightCache.set(key, pending);
  return pending;
}

export function invalidateCachedKey(key: string): void {
  valueCache.delete(key);
  inFlightCache.delete(key);
}

