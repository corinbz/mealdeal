import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { truncateAll, type Db } from "../src/ingest/db.ts";
import { record } from "../src/ingest/record.ts";
import { aldiReader, categoryPaths } from "../src/ingest/readers/aldi.ts";
import { ATTRIBUTES, pageQuery } from "../src/archive/chains/aldi.ts";
import { testDb } from "./helpers/db.ts";
import { writeFixtureArchive } from "./helpers/archive.ts";

/**
 * Aldi (#31): the Algolia index behind aldi.nl, national prices, no EAN.
 *
 * Every record here was RECORDED from the index on 2026-10-14: grapes at
 * -50%, a "2 VOOR" multibuy, a toy not in Stores until 21 October, an OP=OP
 * action article, loose bananas, currants no longer sold, and cheese slices
 * priced "TOT -29%" across several packs.
 */

const DATE = "2026-10-14";

let db: Db;
before(async () => { db = await testDb(); });
beforeEach(async () => { await truncateAll(db); });
after(async () => { await db.end(); });

async function ingestAldi() {
  const root = await writeFixtureArchive({ aldi: { "products/page-0": ["aldi-products.json"] } }, DATE);
  return record(db, "aldi", DATE, await aldiReader.read(root, DATE));
}

test("records the price a Store charges for one pack today, at no Store", async () => {
  const result = await ingestAldi();
  assert.equal(result.counts.productsSeen, 7);
  assert.equal(result.counts.productsRecorded, 3);
  const { rows } = await db.query(
    `SELECT chain_product_ref, store_ref, shelf_price_cents, offer_price_cents, unit_price_cents, comparison_unit, unit_price_source
       FROM price_observation ORDER BY chain_product_ref`,
  );
  assert.deepEqual(rows, [
    // OP=OP: sold at the price shown; Aldi's own Unit Price.
    { chain_product_ref: "1200267", store_ref: null, shelf_price_cents: 129, offer_price_cents: null, unit_price_cents: 323, comparison_unit: "kg", unit_price_source: "chain" },
    // -50%: the strike price is the Shelf Price, Aldi's Unit Price is on the Offer price.
    { chain_product_ref: "1203862", store_ref: null, shelf_price_cents: 239, offer_price_cents: 119, unit_price_cents: 238, comparison_unit: "kg", unit_price_source: "chain" },
    // "Per kg": weighed at the till, at this price a kilo.
    { chain_product_ref: "1219379", store_ref: null, shelf_price_cents: 115, offer_price_cents: null, unit_price_cents: 115, comparison_unit: "kg", unit_price_source: "derived" },
  ]);
  // Not recorded: "2 VOOR" (for two), "TOT -29%" (the cheapest of several
  // packs), "v.a. wo. 21.10." (not in Stores yet) and the unavailable currants.
  const { rows: products } = await db.query(`SELECT chain_product_ref, is_weight_product FROM product WHERE chain_id = 'aldi' ORDER BY 1`);
  assert.deepEqual(products.map((p) => [p.chain_product_ref, p.is_weight_product]), [["1200267", false], ["1203862", false], ["1219379", true]]);
});

test("works out the Unit Price from the pack where Aldi's cannot be right", async () => {
  // RECORDED 2026-10-14: Aldi's Unit Price equal to the pack's price, and one a hundred times it.
  const root = await writeFixtureArchive({ aldi: { "products/page-0": ["aldi-unit-slips.json"] } }, DATE);
  await record(db, "aldi", DATE, await aldiReader.read(root, DATE));
  const { rows } = await db.query(
    `SELECT chain_product_ref, shelf_price_cents, unit_price_cents, unit_price_source FROM price_observation ORDER BY chain_product_ref`,
  );
  assert.deepEqual(rows, [
    // Varkenshaas, ca. 500 g at 6,00, "6,00 per kg".
    { chain_product_ref: "1224343", shelf_price_cents: 600, unit_price_cents: 1200, unit_price_source: "derived" },
    // Melkchocolade, 200 g at 1,95, "1950,00 per kg".
    { chain_product_ref: "1225372", shelf_price_cents: 195, unit_price_cents: 975, unit_price_source: "derived" },
  ]);
});

test("records each Offer with its sign, the one ahead as upcoming", async () => {
  await ingestAldi();
  const { rows } = await db.query(
    `SELECT o.chain_offer_ref, o.store_ref, o.wording, o.is_upcoming, o.ends_at IS NULL AS open_ended, array_agg(op.chain_product_ref) AS products
       FROM offer_observation o JOIN offer_product op ON op.offer_observation_id = o.id
      WHERE o.chain_id = 'aldi' GROUP BY o.id ORDER BY o.chain_offer_ref`,
  );
  assert.deepEqual(rows, [
    { chain_offer_ref: "1203862@2026-10-12", store_ref: null, wording: "-50% 1,19", is_upcoming: false, open_ended: false, products: ["1203862"] },
    { chain_offer_ref: "1204497@2026-10-12", store_ref: null, wording: "2 VOOR 1,00", is_upcoming: false, open_ended: false, products: ["1204497"] },
    { chain_offer_ref: "1245356@2026-10-21", store_ref: null, wording: "v.a. wo. 21.10. 24,99", is_upcoming: true, open_ended: false, products: ["1245356"] },
    { chain_offer_ref: "91214530@2026-10-12", store_ref: null, wording: "TOT -29% 2,49", is_upcoming: false, open_ended: false, products: ["91214530"] },
  ]);
});

test("files a Product on its own shelf, not its brand's or season's", () => {
  assert.deepEqual(categoryPaths({
    lvl0: ["ALDI merken", "Zuivel, eieren en boter"],
    lvl1: ["ALDI merken > Milsani", "Zuivel, eieren en boter > Verse zuivel"],
  }), ["Zuivel, eieren en boter > Verse zuivel"]);
  // A seasonal shelf is kept when it is the only one.
  assert.deepEqual(categoryPaths({ lvl0: ["Sintassortiment "], lvl1: ["Sintassortiment  > Bouwsets"] }), ["Sintassortiment > Bouwsets"]);
});

test("asks the index only for the fields used, never images or long texts", () => {
  const query = pageQuery(2);
  assert.equal(query.page, 2);
  assert.deepEqual(query.attributesToRetrieve, [...ATTRIBUTES]);
  for (const banned of ["assets", "longDescription", "*"]) assert.ok(!query.attributesToRetrieve.includes(banned as never), banned);
});
