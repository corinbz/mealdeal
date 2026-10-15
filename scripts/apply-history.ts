/**
 * Adds a built catalogue's day to the price history, and gives every Product
 * on Offer the reference its verdict is judged against (#18). See
 * src/catalogue/history.ts.
 *
 *   node scripts/apply-history.ts --date 2026-10-14 --catalogue prototype/catalogue.js \
 *     [--history published-history.json] --out-history history.json
 *
 * Rewrites the catalogue in place, appending two fields to each row:
 * referenceLowCents and referenceDays, both null when nothing can be claimed.
 * Without --history (the first morning) the history starts from this day,
 * so no Offer carries a verdict yet.
 */

import { readFile, writeFile } from "node:fs/promises";
import { catalogueScript, HISTORY_COLUMNS, parseCatalogueScript, productsOf, withColumns } from "../src/catalogue/format.ts";
import { recordDay, reference, type PriceHistory, type PricedRow } from "../src/catalogue/history.ts";

function usage(): never {
  console.error("Usage: node scripts/apply-history.ts --date <YYYY-MM-DD> --catalogue <file> [--history <file>] --out-history <file>");
  process.exit(2);
}

const argv = process.argv.slice(2);
let date = "", cataloguePath = "", historyPath = "", outHistory = "";
for (let i = 0; i < argv.length; i++) {
  const next = argv[i + 1] ?? "";
  switch (argv[i]) {
    case "--date": date = next; i++; break;
    case "--catalogue": cataloguePath = next; i++; break;
    case "--history": historyPath = next; i++; break;
    case "--out-history": outHistory = next; i++; break;
    default: usage();
  }
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !cataloguePath || !outHistory) usage();

const text = await readFile(cataloguePath, "utf8");
const data = parseCatalogueScript(text);
const before = historyPath ? (JSON.parse(await readFile(historyPath, "utf8")) as PriceHistory) : null;

const priced: Record<string, PricedRow[]> = {};
for (const chainId of Object.keys(data.catalogue)) {
  priced[chainId] = productsOf(data, chainId).map((p) => ({
    ref: p.ref,
    shelfPriceCents: p.shelfPriceCents,
    offerPriceCents: p.offerPriceCents,
    offerWording: p.offerWording,
    // The row's Offer is the running one; the upcoming one is kept apart.
    offerUpcoming: false,
  }));
}

const history = recordDay(before, date, priced);

const counts: Record<string, { onOffer: number; judged: number }> = {};
const withHistory = withColumns(data, HISTORY_COLUMNS, (p, chainId) => {
  const c = (counts[chainId] ??= { onOffer: 0, judged: 0 });
  const ref = reference(history, chainId, p.ref);
  if (Array.isArray(history.chains[chainId]?.[p.ref]?.at(-1))) c.onOffer++;
  if (ref) c.judged++;
  return [ref?.lowCents ?? null, ref?.days ?? null];
});
for (const [chainId, c] of Object.entries(counts)) console.log(`${chainId}: ${c.onOffer} Products on Offer, ${c.judged} with history to judge them against`);
console.log(`history: ${history.dates.length} day(s), ${history.dates[0]} to ${history.dates.at(-1)}`);

await writeFile(cataloguePath, catalogueScript(withHistory, "scripts/catalogue-from-db.ts"));
await writeFile(outHistory, JSON.stringify(history));
