/**
 * Reports Ingredient coverage after the morning refresh (#35): Ingredients
 * most Chains sell but one does not, a sharp fall in a Chain's mapped
 * Products since yesterday, EAN twins mapped to different Ingredients, and
 * differences between Chains too large to show unchecked, and the self-checks
 * of #37: overnight jumps, split mappings and unit prices that do not follow
 * from the pack. See src/catalogue/coverage.ts, spreads.ts and self-checks.ts.
 *
 *   node scripts/check-coverage.ts --built prototype/catalogue.js [--published published.js]
 *
 * Writes Markdown to stdout, for the job summary, and a GitHub Actions warning
 * per sharp drop. Never fails the refresh: a gap is something to look at, not
 * a reason to withhold today's prices.
 */

import { readFile } from "node:fs/promises";
import { assessCoverage, coverageMarkdown } from "../src/catalogue/coverage.ts";
import { parseCatalogueScript } from "../src/catalogue/format.ts";
import { KNOWN_GAPS } from "../src/catalogue/known-gaps.ts";
import { KNOWN_SLIPS } from "../src/catalogue/known-slips.ts";
import { assessSelfChecks, selfChecksMarkdown } from "../src/catalogue/self-checks.ts";
import { CHECKED_SPREADS } from "../src/catalogue/checked-spreads.ts";
import { assessSpreads, spreadsMarkdown } from "../src/catalogue/spreads.ts";

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

const read = async (path: string) => parseCatalogueScript(await readFile(path, "utf8"));
const today = await read(built);
const before = published ? await read(published) : null;
const coverage = assessCoverage(today, before, KNOWN_GAPS);

for (const d of coverage.drops) {
  console.error(`::warning::${d.chain} has ${d.mapped} Products mapped to an Ingredient, down from ${d.was} yesterday`);
}
console.log(coverageMarkdown(coverage, today, before));
const chainName = (id: string) => today.chains.find((c) => c.id === id)?.name ?? id;
console.log(spreadsMarkdown(assessSpreads(today, CHECKED_SPREADS), chainName));
console.log(selfChecksMarkdown(assessSelfChecks(today, before, KNOWN_SLIPS), today));
