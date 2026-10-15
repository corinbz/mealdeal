/**
 * Writes every comparable Product in the database to the file the basket page
 * runs on.
 *
 *   node scripts/catalogue-from-db.ts [--opinions opinions.md]
 *
 * The page resolves Basket Items itself, in the browser, so it needs each
 * Chain's whole comparable catalogue rather than candidates for a fixed
 * Basket. That is the point: the Basket is whatever the user types.
 *
 * Output goes to prototype/catalogue.js as a plain script, not JSON, because a
 * page opened straight from disk may load a script but may not fetch a file.
 * It is rebuilt from the database and not tracked: committed, every refresh
 * would add megabytes to the history.
 *
 * What goes in it is decided in src/catalogue/build.ts; this only reads the
 * database (src/catalogue/source-db.ts) and writes the file. With
 * --opinions it also writes, as Markdown, where a Product's twins at other
 * Chains, its own shelf or a classifier disagree with its mapping
 * (src/catalogue/opinions.ts):
 * the catalogue has no categories, so this is the only point it can be told.
 */

import { writeFile } from "node:fs/promises";
import { connect } from "../src/ingest/db.ts";
import { buildCatalogue } from "../src/catalogue/build.ts";
import { catalogueScript } from "../src/catalogue/format.ts";
import { readCatalogueSource } from "../src/catalogue/source-db.ts";
import { opinionsMarkdown } from "../src/catalogue/opinions.ts";
import { assessClassifier } from "../src/catalogue/classifier.ts";

const OUT = new URL("../prototype/catalogue.js", import.meta.url);
const argv = process.argv.slice(2);
const opinions = argv[0] === "--opinions" && argv[1] ? argv[1] : null;
if (argv.length && !opinions) {
  console.error("Usage: node scripts/catalogue-from-db.ts [--opinions <file.md>]");
  process.exit(2);
}

const db = connect();
const source = await readCatalogueSource(db);
await db.end();
const { catalogue, counts, conflicts, shelves, labelled } = buildCatalogue(source);
await writeFile(OUT, catalogueScript(catalogue, "scripts/catalogue-from-db.ts"));
const chainName = (id: string) => catalogue.chains.find((c) => c.id === id)?.name ?? id;
if (opinions) await writeFile(opinions, opinionsMarkdown(conflicts, shelves, assessClassifier(labelled), chainName));

const chains = catalogue.chains;
console.error(`wrote ${OUT.pathname}: ${chains.map((c) => `${c.name} ${counts[c.id]!.total} (${counts[c.id]!.upcoming} with an upcoming Offer)`).join(", ")} comparable products`);
// Reported every run (#14): how much of each Chain maps to an Ingredient, and
// how much of that compares in the Ingredient's own unit.
for (const c of chains) {
  const n = counts[c.id]!;
  console.error(`  ${c.name}: ${n.excluded.nonfood} non-food and ${n.excluded.alcohol} wine or spirits left out`);
  console.error(`  ${c.name}: ${n.mapped} mapped to an Ingredient (${n.borrowed} borrowed from a twin, ${n.overruled} outvoted by theirs), ${n.total - n.mapped} unmapped; ${n.comparable} comparable in the Ingredient's unit`);
}
// Twins mapped to different Ingredients: one of them is wrong (#34).
console.error(`  ${conflicts.length} twins whose Chains map them to different Ingredients, ${conflicts.filter((k) => k.settled).length} settled by a majority${conflicts.length ? ":" : ""}`);
for (const k of conflicts) {
  console.error(`    ${k.name} (${k.id}): ${Object.entries(k.ingredients).map(([c, i]) => `${chainName(c)} ${i ?? "none"}`).join(", ")}${k.settled ? ` → ${k.settled}` : ""}`);
}
const exact = catalogue.exact ?? [];
const likely = exact.filter((g) => Object.keys(g.likely).length).length;
console.error(`  ${exact.length} Exact Products shared by EAN, ${likely} with a Product likely the same where no EAN is published`);
