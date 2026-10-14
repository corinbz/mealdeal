import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { truncateAll, type Db } from "../src/ingest/db.ts";
import { record } from "../src/ingest/record.ts";
import { dekamarktReader } from "../src/ingest/readers/detailresult.ts";
import { dekamarkt } from "../src/archive/chains/dekamarkt.ts";
import { dirk } from "../src/archive/chains/dirk.ts";
import { assortmentQuery, OFFERS } from "../src/archive/chains/detailresult.ts";
import { assertNoBannedFields } from "../src/archive/guard.ts";
import { testDb } from "./helpers/db.ts";
import { writeFixtureArchive } from "./helpers/archive.ts";

/**
 * DekaMarkt (#30): Dirk's gateway software at DekaMarkt's own address,
 * read at Store 283, the site's "Volledig assortiment", with national prices.
 *
 * Every row here was RECORDED from web-deka-gateway.dekamarkt.nl on
 * 2026-10-14: a Product on Offer, one not, an unstocked id, and the Offer.
 */

const DATE = "2026-10-14";

let db: Db;
before(async () => { db = await testDb(); });
beforeEach(async () => { await truncateAll(db); });
after(async () => { await db.end(); });

async function ingestDekamarkt() {
  const root = await writeFixtureArchive({
    dekamarkt: {
      "products/store-283/wg-1": ["dekamarkt-products.json"],
      "offers/store-283/dept-1": ["dekamarkt-offers.json"],
    },
  }, DATE);
  return record(db, "dekamarkt", DATE, await dekamarktReader.read(root, DATE));
}

test("records national prices: Store 283 is no shop, so no Store is named", async () => {
  const result = await ingestDekamarkt();
  assert.equal(result.counts.productsSeen, 3);
  assert.equal(result.counts.productsRecorded, 2);
  const { rows } = await db.query(
    `SELECT chain_product_ref, store_ref, shelf_price_cents, offer_price_cents, unit_price_cents, comparison_unit
       FROM price_observation ORDER BY chain_product_ref`,
  );
  assert.deepEqual(rows, [
    // "50% KORTING" on 1,5 kg of potatoes: 1.99 to 0.99, 66 cents a kilo.
    { chain_product_ref: "12910", store_ref: null, shelf_price_cents: 199, offer_price_cents: 99, unit_price_cents: 66, comparison_unit: "kg" },
    // An offer price of 0 is no Offer.
    { chain_product_ref: "74498", store_ref: null, shelf_price_cents: 220, offer_price_cents: null, unit_price_cents: 1100, comparison_unit: "kg" },
  ]);
});

test("records the Offer at no Store, with its sign as the wording", async () => {
  await ingestDekamarkt();
  const { rows } = await db.query(
    `SELECT o.store_ref, o.headline, o.wording, array_agg(op.chain_product_ref) AS products
       FROM offer_observation o JOIN offer_product op ON op.offer_observation_id = o.id
      WHERE o.chain_id = 'dekamarkt' GROUP BY o.id`,
  );
  assert.deepEqual(rows, [{ store_ref: null, headline: "Stamppot Aardappelen", wording: "50% KORTING", products: ["12910"] }]);
});

test("asks DekaMarkt's gateway only for fields it has, and Dirk's as before", () => {
  assert.deepEqual([dekamarkt.defaultStoreIds, dirk.defaultStoreIds], [[283], [66]]);
  assert.doesNotMatch(assortmentQuery(), /singleUsePlasticValue/);
  assert.match(assortmentQuery(["singleUsePlasticValue"]), /isSingleUsePlastic\n    singleUsePlasticValue\n/);
  for (const query of [assortmentQuery(), OFFERS]) assert.doesNotThrow(() => assertNoBannedFields(query, "dekamarkt"));
});
