/**
 * Fails if a day's archive does not look like a real day's archive.
 *
 * The failure mode this exists for is not a crash — it is a run that
 * succeeds and records nothing. Dirk's `listOffers` already demonstrated the
 * shape: called without a `department` it answers with empty offer lists and
 * HTTP 200, so a scheduled job would have reported success every morning
 * while archiving nothing at all. A green tick is not evidence; a floor on
 * what was actually written is.
 *
 *   npm run archive:check -- --manifest archive/2026-10-13/dirk/manifest.json
 */

import { readFile } from "node:fs/promises";
import type { Manifest } from "./sink.ts";

interface Options {
  manifest: string;
  minStoredBytes: number;
  maxFailedSteps: number;
}

function usage(): never {
  console.error(
    `Usage: npm run archive:check -- --manifest <path> [options]

  --manifest <path>          Manifest to check. Required.
  --min-stored-bytes <n>     Fail below this total. Default: 20000
  --max-failed-steps <n>     Failed steps tolerated. Default: 0`,
  );
  process.exit(2);
}

function parseArgs(argv: readonly string[]): Options {
  let manifest = "";
  let minStoredBytes = 20_000;
  let maxFailedSteps = 0;

  for (let i = 0; i < argv.length; i++) {
    const next = argv[i + 1];
    switch (argv[i]) {
      case "--manifest": manifest = next ?? ""; i++; break;
      case "--min-stored-bytes": minStoredBytes = Number(next); i++; break;
      case "--max-failed-steps": maxFailedSteps = Number(next); i++; break;
      case "--help": case "-h": usage();
      default: console.error(`Unknown argument: ${argv[i]}`); usage();
    }
  }
  if (!manifest) usage();
  if (!Number.isFinite(minStoredBytes) || !Number.isFinite(maxFailedSteps)) usage();
  return { manifest, minStoredBytes, maxFailedSteps };
}

const options = parseArgs(process.argv.slice(2));

let manifest: Manifest;
try {
  manifest = JSON.parse(await readFile(options.manifest, "utf8")) as Manifest;
} catch (error) {
  console.error(`Cannot read ${options.manifest}: ${(error as Error).message}`);
  process.exit(1);
}

const stored = manifest.steps.reduce((n, s) => n + s.storedBytes, 0);
const failed = manifest.steps.filter((s) => s.failed);
const problems: string[] = [];

if (manifest.outcome !== "complete") {
  problems.push(
    `outcome is "${manifest.outcome}"${manifest.abortReason ? `: ${manifest.abortReason}` : ""}`,
  );
}
if (stored < options.minStoredBytes) {
  problems.push(
    `only ${stored} B stored, below the ${options.minStoredBytes} B floor — ` +
      `the run may have succeeded while recording nothing`,
  );
}
if (failed.length > options.maxFailedSteps) {
  problems.push(
    `${failed.length} step(s) reported errors (max ${options.maxFailedSteps}): ` +
      failed.slice(0, 5).map((s) => `${s.step} — ${s.failed}`).join(" | "),
  );
}

console.log(
  `${manifest.chain} ${manifest.date}: ${manifest.steps.length} steps, ` +
    `${manifest.requests ?? "?"} requests, ${(stored / 1024).toFixed(0)} KiB stored`,
);

if (problems.length) {
  for (const problem of problems) console.error(`  FAIL: ${problem}`);
  process.exit(1);
}
console.log("  OK");
