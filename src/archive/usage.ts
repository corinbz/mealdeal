/**
 * How much of R2's free tier the archive bucket uses.
 *
 * Normal use is far inside it: a day of both Chains is about 2 MB in some
 * 1300 files, so storage grows by under a gigabyte a year and uploads use
 * around 4% of the monthly free writes. What this guards against is a bug —
 * an upload loop, a Chain suddenly answering with huge responses — running
 * up a bill nobody notices, because R2 has no spending cap.
 *
 * The bucket cannot report its own operation count over the S3 API (that
 * takes Cloudflare's analytics API and another token). Every object written
 * this month is one upload, a Class A operation, so the objects whose last
 * modification falls in the current month are the count used here. It slightly
 * undercounts — overwrites of one key and LIST requests are not seen — which
 * the warning threshold leaves room for.
 */

export interface StoredObject {
  readonly size: number;
  readonly lastModified: Date;
}

export interface UsageLimits {
  /** Free storage, bytes. R2 Standard: 10 GB-month. */
  readonly storageBytes: number;
  /** Free Class A operations a month. R2: 1,000,000. */
  readonly writesPerMonth: number;
  /** Share of a limit at which to warn, and at which to stop the run. */
  readonly warnAt: number;
  readonly stopAt: number;
}

export interface Usage {
  readonly objects: number;
  readonly storageBytes: number;
  readonly writesThisMonth: number;
  readonly storageShare: number;
  readonly writeShare: number;
  readonly level: "ok" | "warn" | "stop";
  /** One line per limit at or above the warning share. */
  readonly reasons: string[];
}

/** R2's free tier for Standard storage, as published on 2026-10-14. */
export const R2_FREE_TIER: UsageLimits = { storageBytes: 10e9, writesPerMonth: 1_000_000, warnAt: 0.5, stopAt: 0.8 };

export function assessUsage(objects: readonly StoredObject[], now: Date, limits: UsageLimits): Usage {
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  let storageBytes = 0, writesThisMonth = 0;
  for (const o of objects) {
    storageBytes += o.size;
    if (o.lastModified.getTime() >= monthStart) writesThisMonth++;
  }
  const storageShare = storageBytes / limits.storageBytes;
  const writeShare = writesThisMonth / limits.writesPerMonth;

  const reasons: string[] = [];
  const pct = (share: number) => (share * 100).toFixed(1) + "%";
  if (storageShare >= limits.warnAt) reasons.push(`storage at ${pct(storageShare)} of the free tier`);
  if (writeShare >= limits.warnAt) reasons.push(`writes this month at ${pct(writeShare)} of the free tier`);
  const worst = Math.max(storageShare, writeShare);
  const level = worst >= limits.stopAt ? "stop" : worst >= limits.warnAt ? "warn" : "ok";

  return { objects: objects.length, storageBytes, writesThisMonth, storageShare, writeShare, level, reasons };
}
