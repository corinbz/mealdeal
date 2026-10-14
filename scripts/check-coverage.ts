/**
 * Reports Ingredient coverage after the morning refresh (#35): Ingredients
 * most Chains sell but one does not, a sharp fall in a Chain's mapped
 * Products since yesterday, and EAN twins mapped to different Ingredients.
 * See src/catalogue/coverage.ts.
 *
 *   node scripts/check-coverage.ts --built prototype/catalogue.js [--published published.js]
 *
 * Writes Markdown to stdout, for the job summary, and a GitHub Actions warning
 * per sharp drop. Never fails the refresh: a gap is something to look at, not
 * a reason to withhold today's prices.
 */

import { readFile } from "node:fs/promises";
import { assessCoverage, coverageMarkdown, type CoverageCatalogue } from "../src/catalogue/coverage.ts";
import { parseCatalogueScript } from "../src/catalogue/assess.ts";
import { KNOWN_GAPS } from "../src/catalogue/known-gaps.ts";

function usage(): never {
  console.error("Usage: node scripts/check-coverage.ts --built <file> [--published <file>]");
  process.exit(2);
}

const argv = process.argv.slice(2);
let built = "", published = "";
for (let i = 0; i < argv.length; i++) {
  const next = argv[i + 1] ?? "";
  switch (argv[i]) {
    case "--built": built = next; i++; break;
    case "--published": published = next; i++; break;
    case "--help": case "-h": usage();
    default: console.error(`Unknown argument: ${argv[i]}`); usage();
  }
}
if (!built) usage();

const read = async (path: string) => parseCatalogueScript(await readFile(path, "utf8")) as unknown as CoverageCatalogue;
const today = await read(built);
const before = published ? await read(published) : null;
const coverage = assessCoverage(today, before, KNOWN_GAPS);

for (const d of coverage.drops) {
  console.error(`::warning::${d.chain} has ${d.mapped} Products mapped to an Ingredient, down from ${d.was} yesterday`);
}
console.log(coverageMarkdown(coverage, today, before));
