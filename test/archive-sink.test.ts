import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSink } from "../src/archive/sink.ts";

/**
 * A resumed run's manifest must describe the whole day. On 2026-10-14 a
 * scheduled run started five hours late, resumed a day already complete,
 * and rewrote its manifest as a day of 1 request.
 */

test("a resumed run adds its requests to the day's, and keeps every step", async () => {
  const root = await mkdtemp(join(tmpdir(), "mealdeal-sink-"));
  try {
    const first = await createSink(root, "dirk", "2026-10-14");
    await first.writeStep("offers", []);
    await first.finish("failed", { abortReason: "timeout", requests: 1492, retries: 2 });

    const resumed = await createSink(root, "dirk", "2026-10-14");
    assert.equal(resumed.done("offers"), true);
    await resumed.writeStep("products/wg-5", []);
    const manifest = await resumed.finish("complete", { requests: 1, retries: 0 });

    assert.equal(manifest.requests, 1493);
    assert.equal(manifest.retries, 2);
    assert.deepEqual(manifest.steps.map((s) => s.step), ["offers", "products/wg-5"]);
  } finally {
    await rm(root, { recursive: true });
  }
});
