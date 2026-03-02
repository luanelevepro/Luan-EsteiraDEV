const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_EXPIRATION_TIME = 20 * 60 * 1000;

export const getCachedData = async <T>(
  key: string,
  fetchFunction: () => Promise<T>
): Promise<T> => {
  const now = Date.now();

  if (cache.has(key)) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    } else {
      cache.delete(key);
    }
  }
  const data = await fetchFunction();
  cache.set(key, { data, expiresAt: now + CACHE_EXPIRATION_TIME });

  return data;
};

export const invalidateCache = (key: string): boolean => {
  return cache.delete(key);
};
