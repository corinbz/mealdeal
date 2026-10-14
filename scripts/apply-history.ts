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
import { parseCatalogueScript } from "../src/catalogue/assess.ts";
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
const data = parseCatalogueScript(text) as unknown as { catalogue: Record<string, unknown[][]> };
const before = historyPath ? (JSON.parse(await readFile(historyPath, "utf8")) as PriceHistory) : null;

// Row positions as written by scripts/catalogue-from-db.ts.
const priced: Record<string, PricedRow[]> = {};
for (const [chainId, rows] of Object.entries(data.catalogue)) {
  priced[chainId] = rows.map((r) => ({
    ref: r[0] as string,
    shelfPriceCents: r[6] as number,
    offerPriceCents: r[7] as number | null,
    offerWording: r[9] as string | null,
    // The row's Offer is the running one; the upcoming one is kept apart.
    offerUpcoming: false,
  }));
}

const history = recordDay(before, date, priced);

for (const [chainId, rows] of Object.entries(data.catalogue)) {
  let onOffer = 0, judged = 0;
  for (const row of rows) {
    const ref = reference(history, chainId, row[0] as string);
    if (Array.isArray(history.chains[chainId]?.[row[0] as string]?.at(-1))) onOffer++;
    if (ref) judged++;
    row.push(ref?.lowCents ?? null, ref?.days ?? null);
  }
  console.log(`${chainId}: ${onOffer} Products on Offer, ${judged} with history to judge them against`);
}
console.log(`history: ${history.dates.length} day(s), ${history.dates[0]} to ${history.dates.at(-1)}`);

const header = text.slice(0, text.indexOf("window.CATALOGUE"));
await writeFile(cataloguePath, `${header}window.CATALOGUE = ${JSON.stringify(data)};\n`);
await writeFile(outHistory, JSON.stringify(history));
