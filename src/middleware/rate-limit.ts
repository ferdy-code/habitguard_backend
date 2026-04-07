import type { Context, Next } from "hono";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores: Record<string, Map<string, RateLimitEntry>> = {};

function getStore(namespace: string): Map<string, RateLimitEntry> {
  if (!stores[namespace]) {
    stores[namespace] = new Map();
  }
  return stores[namespace];
}

function cleanup(store: Map<string, RateLimitEntry>) {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

interface RateLimitOptions {
  namespace: string;
  limit: number;
  windowMs: number;
}

export function rateLimit(options: RateLimitOptions) {
  const { namespace, limit, windowMs } = options;
  const store = getStore(namespace);

  return async (c: Context, next: Next) => {
    cleanup(store);

    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      c.header("X-RateLimit-Limit", String(limit));
      c.header("X-RateLimit-Remaining", String(limit - 1));
      return next();
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json(
        {
          success: false,
          message: "Too many requests, please try again later.",
        },
        429
      );
    }

    entry.count++;
    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(limit - entry.count));
    return next();
  };
}

export const authRateLimit = () =>
  rateLimit({ namespace: "auth", limit: 10, windowMs: 60 * 1000 });

export const apiRateLimit = () =>
  rateLimit({ namespace: "api", limit: 60, windowMs: 60 * 1000 });

export const aiRateLimit = () =>
  rateLimit({ namespace: "ai", limit: 10, windowMs: 60 * 1000 });
