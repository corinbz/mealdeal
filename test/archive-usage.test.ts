import { test } from "node:test";
import assert from "node:assert/strict";
import { assessUsage, type StoredObject } from "../src/archive/usage.ts";

/**
 * The guard that keeps the archive bucket inside R2's free tier. It exists
 * because the realistic way to run up a bill is not normal use (about 4% of
 * the free writes, 2 MB a day) but a bug, such as an upload loop, that
 * nothing else would notice until the invoice.
 */

const LIMITS = { storageBytes: 10e9, writesPerMonth: 1_000_000, warnAt: 0.5, stopAt: 0.8 };
const NOW = new Date("2026-10-14T04:30:00Z");
const obj = (size: number, lastModified: string): StoredObject => ({ size, lastModified: new Date(lastModified) });

test("an empty bucket is well inside the free tier", () => {
  const usage = assessUsage([], NOW, LIMITS);
  assert.equal(usage.storageBytes, 0);
  assert.equal(usage.writesThisMonth, 0);
  assert.equal(usage.level, "ok");
});

test("counts writes in the current calendar month only, in UTC", () => {
  const usage = assessUsage([
    obj(100, "2026-10-01T00:00:00Z"),
    obj(100, "2026-10-13T22:36:00Z"),
    obj(100, "2026-09-30T23:59:59Z"), // last month: stored, but not a write this month
  ], NOW, LIMITS);
  assert.equal(usage.storageBytes, 300);
  assert.equal(usage.writesThisMonth, 2);
});

test("warns at half of either limit", () => {
  const storage = assessUsage([obj(5e9, "2026-01-01T00:00:00Z")], NOW, LIMITS);
  assert.equal(storage.level, "warn");
  assert.match(storage.reasons.join(" "), /storage/);

  const writes = Array.from({ length: 500_000 }, () => obj(1, "2026-10-02T00:00:00Z"));
  const busy = assessUsage(writes, NOW, LIMITS);
  assert.equal(busy.level, "warn");
  assert.match(busy.reasons.join(" "), /writes/);
});

test("stops at 80% of either limit", () => {
  assert.equal(assessUsage([obj(8e9, "2026-01-01T00:00:00Z")], NOW, LIMITS).level, "stop");
  const writes = Array.from({ length: 800_000 }, () => obj(1, "2026-10-02T00:00:00Z"));
  assert.equal(assessUsage(writes, NOW, LIMITS).level, "stop");
});

test("a real day of captures is far from either limit", () => {
  // 2026-10-13 as uploaded: 1302 files, 2.14 MB.
  const day = Array.from({ length: 1302 }, () => obj(1647, "2026-10-13T22:40:00Z"));
  const usage = assessUsage(day, NOW, LIMITS);
  assert.equal(usage.level, "ok");
  assert.ok(usage.storageShare < 0.001 && usage.writeShare < 0.002);
});
