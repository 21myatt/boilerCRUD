import type { IncomingMessage } from "node:http";
import { AppError } from "@imsys/utils";

type BucketState = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, BucketState>();
let cleanupCounter = 0;

const getClientAddress = (request: IncomingMessage) => {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.socket.remoteAddress ?? "unknown";
};

const getWindowMs = () => Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const getDefaultMax = () => Number(process.env.RATE_LIMIT_MAX ?? 120);
const getAdminMax = () => Number(process.env.RATE_LIMIT_ADMIN_MAX ?? 20);

const getBucketLimit = (pathname: string) => (
  pathname.startsWith("/admin/") || pathname.startsWith("/users")
    ? getAdminMax()
    : getDefaultMax()
);

const pruneExpiredBuckets = (now: number) => {
  cleanupCounter += 1;

  if (cleanupCounter % 100 !== 0) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

export class RateLimitExceededError extends AppError {
  constructor() {
    super("Too many requests", 429);
    this.name = "RateLimitExceededError";
  }
}

export const enforceRateLimit = (request: IncomingMessage, pathname: string) => {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const clientAddress = getClientAddress(request);
  const routeGroup = pathname.startsWith("/admin/") || pathname.startsWith("/users")
    ? "admin"
    : "default";
  const key = `${clientAddress}:${routeGroup}`;
  const windowMs = getWindowMs();
  const limit = getBucketLimit(pathname);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return;
  }

  if (existing.count >= limit) {
    throw new RateLimitExceededError();
  }

  existing.count += 1;
};
