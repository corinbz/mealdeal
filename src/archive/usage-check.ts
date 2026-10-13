/**
 * Stops the daily archive run before it writes anything when the bucket is
 * near R2's free tier, and warns well before that. See usage.ts for why.
 *
 * Reads the bucket listing the AWS CLI prints (`aws s3api list-objects-v2
 * --output json`, which pages through the whole bucket by itself):
 *
 *   npm run archive:usage -- listing.json
 *
 * Exits 1 at the stop threshold. Writes GitHub Actions annotations, so a
 * warning shows on the run page, not only in its log.
 */

import { readFile } from "node:fs/promises";
import { assessUsage, R2_FREE_TIER, type StoredObject } from "./usage.ts";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npm run archive:usage -- <list-objects-v2 JSON file>");
  process.exit(2);
}

// An empty bucket makes the CLI print nothing at all rather than "{}".
const raw = (await readFile(path, "utf8")).trim();
const listing = (raw ? JSON.parse(raw) : {}) as { Contents?: { Size: number; LastModified: string }[] };
const objects: StoredObject[] = (listing.Contents ?? []).map((o) => ({ size: o.Size, lastModified: new Date(o.LastModified) }));

const usage = assessUsage(objects, new Date(), R2_FREE_TIER);
const mb = (bytes: number) => (bytes / 1e6).toFixed(1) + " MB";
console.log(
  `R2 bucket: ${usage.objects} objects, ${mb(usage.storageBytes)} (${(usage.storageShare * 100).toFixed(2)}% of free storage), ` +
  `${usage.writesThisMonth} written this month (${(usage.writeShare * 100).toFixed(2)}% of free writes).`,
);

if (usage.level === "stop") {
  console.log(`::error::Archive bucket is near R2's free tier: ${usage.reasons.join("; ")}. Stopping before writing more. See docs/archive.md.`);
  process.exit(1);
}
if (usage.level === "warn") {
  console.log(`::warning::Archive bucket is past half of R2's free tier: ${usage.reasons.join("; ")}. See docs/archive.md.`);
}
