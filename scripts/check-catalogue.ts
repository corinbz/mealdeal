/**
 * Refuses a built catalogue that should not replace the published one. See
 * src/catalogue/assess.ts for why this is needed when ingest has its own
 * volume alarm.
 *
 *   node scripts/check-catalogue.ts --date 2026-10-14 --chain dirk --chain jumbo \
 *     --built prototype/catalogue.js [--published published.js]
 *
 * Without --published (the first publish) it still requires every Chain to be
 * present, swept that day, and to have comparable Products. Exits 1 on any
 * problem, writing GitHub Actions error annotations.
 */

import { readFile } from "node:fs/promises";
import { assessCatalogue, parseCatalogueScript } from "../src/catalogue/assess.ts";

function usage(): never {
  console.error(
    `Usage: node scripts/check-catalogue.ts --date <YYYY-MM-DD> --chain <id>... --built <file> [options]

  --published <file>   The catalogue currently published, to compare against.
  --min-ratio <n>      Fail below this share of the published count. Default: 0.5`,
  );
  process.exit(2);
}

const argv = process.argv.slice(2);
let date = "", built = "", published = "", minRatio = 0.5;
const chains: string[] = [];
for (let i = 0; i < argv.length; i++) {
  const next = argv[i + 1] ?? "";
  switch (argv[i]) {
    case "--date": date = next; i++; break;
    case "--chain": chains.push(next); i++; break;
    case "--built": built = next; i++; break;
    case "--published": published = next; i++; break;
    case "--min-ratio": minRatio = Number(next); i++; break;
    case "--help": case "-h": usage();
    default: console.error(`Unknown argument: ${argv[i]}`); usage();
  }
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !built || !chains.length || !Number.isFinite(minRatio)) usage();

const read = async (path: string) => parseCatalogueScript(await readFile(path, "utf8"));
const catalogue = await read(built);
const before = published ? await read(published) : null;

for (const id of chains) {
  const count = catalogue.catalogue[id]?.length ?? 0;
  const was = before?.catalogue[id]?.length;
  const observedAt = catalogue.chains.find((c) => c.id === id)?.observedAt ?? "?";
  console.log(`${id}: ${count} comparable Products, swept ${observedAt}` + (was === undefined ? "" : ` (published: ${was})`));
}

const problems = assessCatalogue(catalogue, before, { date, chains, minRatio });
for (const problem of problems) console.log(`::error::Not publishing the catalogue: ${problem}`);
process.exit(problems.length ? 1 : 0);
