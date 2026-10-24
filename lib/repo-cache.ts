// Shared repository details cache map
// Key format: `${email}-${repoId}`
export const repoCache = new Map<
  string,
  {
    timestamp: number;
    data: any;
  }
>();

// Cache duration: 5 minutes
export const CACHE_TTL = 5 * 60 * 1000;

/**
 * Invalidate cache entries for a specific user email
 */
export const invalidateUserCache = (email: string) => {
  for (const key of repoCache.keys()) {
    if (key.startsWith(`${email}-`)) {
      repoCache.delete(key);
    }
  }
};
