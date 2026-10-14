import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { truncateAll, type Db } from "../src/ingest/db.ts";
import { record } from "../src/ingest/record.ts";
import { plusReader, amsterdamDay } from "../src/ingest/readers/plus.ts";
import { apiVersionIn } from "../src/archive/chains/plus.ts";
import { testDb } from "./helpers/db.ts";
import { writeFixtureArchive, FIXTURE_DATE } from "./helpers/archive.ts";

/**
 * Plus (#27): national Shelf Prices, the running Offer on each Product with
 * its wording, dates and Plus's own Offer price, and no EANs.
 *
 * Every row here was RECORDED from Plus's product-list screen service on
 * 2026-10-14, ten of 17,473, each picked for a case the catalogue contains.
 * Only the two page envelopes around them are cut down.
 */

let db: Db;
before(async () => { db = await testDb(); });
beforeEach(async () => { await truncateAll(db); });
after(async () => { await db.end(); });

async function ingestPlus() {
  const root = await writeFixtureArchive({ plus: { "products/fixture": ["plus-products.json"] } });
  const reading = await plusReader.read(root, FIXTURE_DATE);
  return { reading, result: await record(db, "plus", FIXTURE_DATE, reading) };
}

async function observation(ref: string) {
  const { rows } = await db.query<{
    pack_text: string | null; pack_quantity: string | null; pack_unit: string | null; is_weight_product: boolean;
    categories: string[]; store_ref: string | null; shelf_price_cents: number; offer_price_cents: number | null;
    unit_price_cents: number | null; comparison_unit: string | null;
  }>(
    `SELECT p.pack_text, p.pack_quantity, p.pack_unit, p.is_weight_product, p.categories, o.store_ref,
            o.shelf_price_cents, o.offer_price_cents, o.unit_price_cents, o.comparison_unit
       FROM product p JOIN price_observation o USING (chain_id, chain_product_ref)
      WHERE p.chain_id = 'plus' AND p.chain_product_ref = $1`,
    [ref],
  );
  return rows[0]!;
}

async function offerOf(ref: string) {
  const { rows } = await db.query<{ wording: string; starts_at: Date; ends_at: Date; is_upcoming: boolean }>(
    `SELECT o.wording, o.starts_at, o.ends_at, o.is_upcoming FROM offer_observation o
       JOIN offer_product op ON op.offer_observation_id = o.id WHERE op.chain_product_ref = $1`,
    [ref],
  );
  return rows;
}

test("records every product nationally, with no EANs", async () => {
  const { result } = await ingestPlus();
  assert.equal(result.counts.productsRecorded, 10);
  const { rows } = await db.query<{ store_ref: string | null }>("SELECT DISTINCT store_ref FROM price_observation");
  assert.deepEqual(rows, [{ store_ref: null }]);
  const { rows: eans } = await db.query("SELECT * FROM product_ean");
  assert.deepEqual(eans, []);
});

test("derives a unit price from the pack, and reads prices sent as strings", async () => {
  await ingestPlus();
  const melk = await observation("957806");
  assert.deepEqual([melk.pack_text, melk.shelf_price_cents, melk.unit_price_cents, melk.comparison_unit, melk.offer_price_cents],
    ["Per 1000 ml", 89, 89, "l", null]);
  const vissticks = await observation("944056");
  assert.deepEqual([vissticks.pack_quantity, vissticks.pack_unit, vissticks.unit_price_cents], ["15", "piece", 17]);
});

test("reads 'Per kilo' as one kilo, and marks what is sold by the kilo", async () => {
  await ingestPlus();
  // The name says "8 stuks"; the price is per kilo, which the pack states.
  const speklap = await observation("992701");
  assert.deepEqual([speklap.pack_quantity, speklap.pack_unit, speklap.unit_price_cents, speklap.is_weight_product],
    ["1", "kg", 1254, true]);
  assert.equal((await observation("957806")).is_weight_product, false);
});

test("keeps Plus's own Offer price, rounded to the cent", async () => {
  await ingestPlus();
  // 25% off EUR 1.19 is sent as "0.8925".
  const bonen = await observation("470941");
  assert.deepEqual([bonen.shelf_price_cents, bonen.offer_price_cents, bonen.unit_price_cents], [119, 89, 198]);
  assert.equal((await offerOf("470941"))[0]!.wording, "25 % KORTING");
});

test("records Plus's price even where its own wording disagrees", async () => {
  await ingestPlus();
  // Plus labels the pears "1.69 PER KILO" and sends 1.49 as the Offer
  // price, on its own product page too. Both are kept as sent; no price is
  // derived from the wording (ADR-0002).
  assert.equal((await observation("113834")).offer_price_cents, 149);
  assert.equal((await offerOf("113834"))[0]!.wording, "1.69 PER KILO");
});

test("an Offer with no price of its own is wording only", async () => {
  await ingestPlus();
  // "1+1 GRATIS" comes with NewPrice "0.0": no price, not free.
  const loempia = await observation("326534");
  assert.equal(loempia.offer_price_cents, null);
  assert.equal(loempia.unit_price_cents, 848);
  assert.equal((await offerOf("326534"))[0]!.wording, "1+1 GRATIS");
});

test("does not record a delivery perk as an Offer", async () => {
  await ingestPlus();
  // "Gratis bezorging BIJ 10.00 EURO" changes no Product's price.
  assert.deepEqual(await offerOf("368320"), []);
  assert.equal((await observation("368320")).offer_price_cents, null);
});

test("an Offer runs over whole Amsterdam days", async () => {
  await ingestPlus();
  const [o] = await offerOf("308208");
  // "3 VOOR 5.00" from 30 September to 24 November, CEST then CET.
  assert.equal(o!.starts_at.toISOString(), "2026-09-29T22:00:00.000Z");
  assert.equal(o!.ends_at.toISOString(), "2026-11-24T22:59:59.000Z");
  assert.equal(o!.is_upcoming, false);
  assert.equal(amsterdamDay("1900-01-01"), null);
});

test("records a product with no pack, without a unit price", async () => {
  const { result } = await ingestPlus();
  const sok = await observation("593861");
  assert.deepEqual([sok.pack_text, sok.unit_price_cents], [null, null]);
  assert.equal(result.counts.withoutUnitPrice, 1);
});

test("files each product under its category path", async () => {
  await ingestPlus();
  assert.deepEqual((await observation("957806")).categories, ["Zuivel, eieren, boter > Houdbare zuivel > Houdbare melk"]);
});

test("never reads the image URLs and marketing text the list sends", async () => {
  const { reading } = await ingestPlus();
  const text = JSON.stringify(reading);
  assert.ok(!text.includes("ctfassets"));
  assert.ok(!text.includes("Bestel "));
});

test("finds an action's API version in the script that calls it", () => {
  const script = `return controller.callDataAction("DataActionGetProductListAndCategoryInfo", "screenservices/ECP_Composition_CW/ProductLists/PLP_Content/DataActionGetProductListAndCategoryInfo", "cafT+CKg7ockKx+9Kx_BsQ", function (b) {`;
  assert.equal(apiVersionIn(script, "DataActionGetProductListAndCategoryInfo"), "cafT+CKg7ockKx+9Kx_BsQ");
  assert.equal(apiVersionIn(script, "DataActionGetMenuCategories"), null);
});
