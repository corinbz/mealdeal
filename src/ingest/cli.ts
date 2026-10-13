/**
 * Reads a day out of the archive and records it.
 *
 *   npm run db:migrate
 *   npm run ingest -- --chain dirk --date 2026-10-13
 *
 * This never contacts a Chain. The archiver owns that path; ingest reads what
 * the archiver wrote, which means a parser improved later can be re-run over
 * every day already captured.
 */

import { connect, migrate } from "./db.ts";
import { record, DEFAULT_OPTIONS } from "./record.ts";
import { dirkReader } from "./readers/dirk.ts";
import { jumboReader } from "./readers/jumbo.ts";
import type { ChainReader } from "./readers/types.ts";

const READERS: Record<string, ChainReader> = {
  dirk: dirkReader,
  jumbo: jumboReader,
};

function usage(): never {
  console.error(
    `Usage: npm run ingest -- --chain <${Object.keys(READERS).join("|")}|all> [options]

  --chain <name>           Chain to ingest, or "all". Repeatable. Required.
  --date <YYYY-MM-DD>      Archive date to read. Default: today.
  --archive <dir>          Archive root. Default: ./archive
  --min-volume-ratio <n>   Reject below this share of the previous run. Default: 0.5
  --force                  Record even when the volume alarm fires.
  --migrate                Apply the schema before running.`,
  );
  process.exit(2);
}

const argv = process.argv.slice(2);
const names: string[] = [];
let date = new Date().toISOString().slice(0, 10);
let archive = "archive";
let minVolumeRatio = DEFAULT_OPTIONS.minVolumeRatio;
let force = false;
let shouldMigrate = false;

for (let i = 0; i < argv.length; i++) {
  const next = argv[i + 1];
  switch (argv[i]) {
    case "--chain": names.push(next ?? ""); i++; break;
    case "--date": date = next ?? date; i++; break;
    case "--archive": archive = next ?? archive; i++; break;
    case "--min-volume-ratio": minVolumeRatio = Number(next); i++; break;
    case "--force": force = true; break;
    case "--migrate": shouldMigrate = true; break;
    case "--help": case "-h": usage();
    default: console.error(`Unknown argument: ${argv[i]}`); usage();
  }
}
if (!names.length || !Number.isFinite(minVolumeRatio)) usage();

const chains = (names.includes("all") ? Object.keys(READERS) : names).map((name) => {
  const reader = READERS[name];
  if (!reader) { console.error(`Unknown chain: ${name}`); usage(); }
  return reader;
});

const db = connect();
let clean = true;
try {
  if (shouldMigrate) await migrate(db);

  for (const reader of chains) {
    const reading = await reader.read(archive, date);
    const result = await record(db, reader.chainId, date, reading, {
      minVolumeRatio,
      force,
    });
    const c = result.counts;

    console.log(
      `\n${reader.chainId} ${date}: ${result.outcome}` +
        (result.runId ? ` (run ${result.runId})` : ""),
    );
    console.log(
      `  ${c.productsRecorded} products recorded of ${c.productsSeen} seen · ` +
        `${c.pricesRecorded} price observations · ${c.offersRecorded} offers`,
    );
    // A Product with no derivable Unit Price is not a comparison candidate.
    // It is kept, and counted, so the gap is a known number.
    console.log(
      `  ${c.withoutUnitPrice} without a unit price · ` +
        `${c.parseFailures} parse failures`,
    );
    if (result.notes) console.log(`  ${result.notes}`);
    if (result.outcome !== "complete") clean = false;
    if (c.productsRecorded === 0) {
      console.error(`  nothing was recorded for ${reader.chainId}`);
      clean = false;
    }
  }
} finally {
  await db.end();
}
process.exit(clean ? 0 : 1);
