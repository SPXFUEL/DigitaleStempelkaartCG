/**
 * In-memory rate-limiter / lockout. Goed genoeg voor één Vercel-instance;
 * bij meerdere regions kun je dit later vervangen door Upstash Redis.
 *
 * Twee primitives:
 *  - `recordAttempt(key, max, windowSec)` — telt mispogingen binnen window;
 *    returnt true zodra `key` over max heen gaat. Gebruik om login te
 *    blokkeren (clear bij succes).
 *  - `tryConsume(key, intervalSec)` — staat ≤1 actie per interval toe per
 *    `key`. Gebruik voor stamp-cooldown / idempotency.
 *
 * Beide werken puur in-memory. Op cold-start ben je 'm kwijt — dat is OK,
 * want zowel login als stamp-cooldown zijn "zo lang als het proces leeft"
 * use-cases, niet harde audit-vereisten.
 */

interface FailBucket {
  count: number;
  firstAt: number;
  blockedUntil: number;
}

const failBuckets = new Map<string, FailBucket>();
const consumeStamps = new Map<string, number>();

const MAX_ENTRIES = 5000; // safety-cap, voorkomt geheugen-bloat bij key-spray

/** Garbage-collect: drop verlopen buckets als de map te groot wordt. */
function gcIfNeeded() {
  if (failBuckets.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of failBuckets) {
    if (v.blockedUntil < now && now - v.firstAt > 3600 * 1000) {
      failBuckets.delete(k);
    }
    if (failBuckets.size <= MAX_ENTRIES * 0.8) break;
  }
}

export interface AttemptStatus {
  /** Mag deze poging plaatsvinden? */
  allowed: boolean;
  /** Aantal mispogingen binnen het huidige window. */
  count: number;
  /** Hoeveel seconden tot lockout vervalt (alleen relevant als allowed=false). */
  retryAfterSec: number;
}

/**
 * Check of `key` (bv. IP) mag proberen. Reken niet als poging — alleen
 * lezen, geen mutatie. Roep `recordFailure` aan bij een mislukte attempt
 * en `clearFailures` bij een geslaagde.
 */
export function checkLockout(
  key: string,
  max: number,
  windowSec: number
): AttemptStatus {
  if (max <= 0) return { allowed: true, count: 0, retryAfterSec: 0 };
  const bucket = failBuckets.get(key);
  const now = Date.now();

  if (!bucket) return { allowed: true, count: 0, retryAfterSec: 0 };

  if (bucket.blockedUntil > now) {
    return {
      allowed: false,
      count: bucket.count,
      retryAfterSec: Math.ceil((bucket.blockedUntil - now) / 1000),
    };
  }

  // Window is voorbij — reset
  if (now - bucket.firstAt > windowSec * 1000) {
    failBuckets.delete(key);
    return { allowed: true, count: 0, retryAfterSec: 0 };
  }

  return { allowed: true, count: bucket.count, retryAfterSec: 0 };
}

/**
 * Boekt een failure. Als `count > max`, blokkeren we voor `lockoutSec`.
 */
export function recordFailure(
  key: string,
  max: number,
  windowSec: number,
  lockoutSec: number
): AttemptStatus {
  if (max <= 0) return { allowed: true, count: 0, retryAfterSec: 0 };
  gcIfNeeded();
  const now = Date.now();
  const existing = failBuckets.get(key);
  let bucket: FailBucket;

  if (!existing || now - existing.firstAt > windowSec * 1000) {
    bucket = { count: 1, firstAt: now, blockedUntil: 0 };
  } else {
    bucket = { ...existing, count: existing.count + 1 };
  }

  if (bucket.count >= max) {
    bucket.blockedUntil = now + lockoutSec * 1000;
  }

  failBuckets.set(key, bucket);

  return {
    allowed: bucket.blockedUntil <= now,
    count: bucket.count,
    retryAfterSec:
      bucket.blockedUntil > now
        ? Math.ceil((bucket.blockedUntil - now) / 1000)
        : 0,
  };
}

export function clearFailures(key: string) {
  failBuckets.delete(key);
}

/**
 * Eén actie per `intervalSec` per key. Returnt true als de actie nu mag,
 * false als-ie binnen interval al een keer is uitgevoerd.
 */
export function tryConsume(key: string, intervalSec: number): boolean {
  if (intervalSec <= 0) return true;
  const now = Date.now();
  const last = consumeStamps.get(key) ?? 0;
  if (now - last < intervalSec * 1000) return false;
  consumeStamps.set(key, now);
  if (consumeStamps.size > MAX_ENTRIES) {
    // Drop oudste 20% (Maps zijn insertion-ordered)
    const drop = Math.floor(consumeStamps.size * 0.2);
    let i = 0;
    for (const k of consumeStamps.keys()) {
      if (i++ >= drop) break;
      consumeStamps.delete(k);
    }
  }
  return true;
}

/**
 * Bepaal een redelijke "client identity" key vanuit de request headers.
 * Vercel zet `x-forwarded-for`; lokaal pakken we als fallback "unknown".
 */
export function clientKey(headers: Headers, prefix = ""): string {
  const fwd = headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
  return prefix ? `${prefix}:${ip}` : ip;
}

/** Alleen voor tests / dev-tooling. */
export function __resetAll() {
  failBuckets.clear();
  consumeStamps.clear();
}
