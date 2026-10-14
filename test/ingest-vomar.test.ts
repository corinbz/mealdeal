import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { truncateAll, type Db } from "../src/ingest/db.ts";
import { record } from "../src/ingest/record.ts";
import { vomarReader } from "../src/ingest/readers/vomar.ts";
import { testDb } from "./helpers/db.ts";
import { writeFixtureArchive, FIXTURE_DATE } from "./helpers/archive.ts";

/**
 * Vomar publishes national Shelf Prices, a primary EAN plus additional ones,
 * a pack in two fields, and no Offers at all.
 *
 * Every row here was RECORDED from gateway.vomar.nl on 2026-10-14, cut down
 * to twelve Products and the parts of the department tree they sit in. Each
 * was picked for a case the full catalogue really contains.
 */

let db: Db;
before(async () => { db = await testDb(); });
beforeEach(async () => { await truncateAll(db); });
after(async () => { await db.end(); });

const VOMAR_FIXTURES = {
  vomar: {
    departments: ["vomar-departments.json"],
    "products/dept-50/mg-500": ["vomar-products.json"],
  },
};

async function ingestVomar() {
  const root = await writeFixtureArchive(VOMAR_FIXTURES);
  const reading = await vomarReader.read(root, FIXTURE_DATE);
  return { reading, result: await record(db, "vomar", FIXTURE_DATE, reading) };
}

async function product(ref: string) {
  const { rows } = await db.query<{
    name: string; brand: string | null; pack_text: string | null; pack_quantity: string | null; pack_unit: string | null;
    is_weight_product: boolean; categories: string[]; store_ref: string | null; shelf_price_cents: number;
    offer_price_cents: number | null; unit_price_cents: number | null; comparison_unit: string | null;
    unit_price_source: string | null;
  }>(
    `SELECT p.name, p.brand, p.pack_text, p.pack_quantity, p.pack_unit, p.is_weight_product, p.categories,
            o.store_ref, o.shelf_price_cents, o.offer_price_cents, o.unit_price_cents, o.comparison_unit,
            o.unit_price_source
       FROM product p JOIN price_observation o USING (chain_id, chain_product_ref)
      WHERE p.chain_id = 'vomar' AND p.chain_product_ref = $1`,
    [ref],
  );
  return rows[0]!;
}

test("records every product, priced nationally, with no offers", async () => {
  const { result } = await ingestVomar();
  assert.equal(result.counts.productsSeen, 12);
  assert.equal(result.counts.productsRecorded, 12);
  assert.equal(result.counts.offersRecorded, 0);
  const { rows } = await db.query<{ store_ref: string | null }>("SELECT DISTINCT store_ref FROM price_observation");
  assert.deepEqual(rows, [{ store_ref: null }]);
});

test("derives a unit price from the pack fields, marked as ours", async () => {
  await ingestVomar();
  const p = await product("122576");
  // G'woon Pindakaas: contents "350", unit "gram", EUR 0.67.
  assert.equal(p.pack_text, "350 gram");
  assert.deepEqual(
    [p.pack_quantity, p.pack_unit, p.shelf_price_cents, p.unit_price_cents, p.comparison_unit, p.unit_price_source],
    ["0.35", "kg", 67, 191, "kg", "derived"],
  );
});

test("reads millilitres, pieces and 'per stuk'", async () => {
  await ingestVomar();
  const melk = await product("713600");
  assert.deepEqual([melk.pack_text, melk.unit_price_cents, melk.comparison_unit], ["1000 ml", 75, "l"]);
  const eieren = await product("135204");
  assert.deepEqual([eieren.pack_text, eieren.unit_price_cents, eieren.comparison_unit], ["6 stuks", 38, "piece"]);
  const komkommer = await product("725803");
  assert.deepEqual([komkommer.pack_text, komkommer.unit_price_cents, komkommer.comparison_unit], ["per stuk", 67, "piece"]);
});

test("reads a pack written with its unit twice", async () => {
  await ingestVomar();
  // contents "355GR", unit "gram": kept as Vomar wrote it, read as 355 g.
  const p = await product("805335");
  assert.deepEqual([p.pack_text, p.pack_quantity, p.pack_unit], ["355GR gram", "0.355", "kg"]);
});

test("falls back to the name when the pack fields are empty", async () => {
  await ingestVomar();
  // contents and unit are both null; the name says 500ml.
  const p = await product("143386");
  assert.deepEqual([p.pack_text, p.pack_quantity, p.pack_unit, p.unit_price_cents], [null, "0.5", "l", 1070]);
});

test("counts a piece pack by its pieces, not the size in its name", async () => {
  await ingestVomar();
  // "G'woon Huisvuilzak 60l", 20 stuks. 60 l is each bag's capacity; read
  // from the name it would price bin bags per litre.
  const p = await product("135406");
  assert.deepEqual([p.pack_quantity, p.pack_unit, p.comparison_unit], ["20", "piece", "piece"]);
});

test("records a product whose pack cannot be read, without a unit price", async () => {
  const { result } = await ingestVomar();
  // contents "2", unit null, and no quantity in the name: the one Product of
  // 6,268 on 2026-10-14 with no Unit Price. Kept, and counted.
  const p = await product("306880");
  assert.deepEqual([p.pack_text, p.unit_price_cents, p.comparison_unit], ["2", null, null]);
  assert.equal(result.counts.withoutUnitPrice, 1);
});

test("marks weighed products, loose and pre-packed", async () => {
  await ingestVomar();
  // pieceWeight 2: loose apples, priced per kg. 1: a weighed cheese.
  assert.equal((await product("111726")).is_weight_product, true);
  assert.equal((await product("90123")).is_weight_product, true);
  assert.equal((await product("122576")).is_weight_product, false);
});

test("stores the primary ean and every additional one", async () => {
  await ingestVomar();
  const { rows } = await db.query<{ ean: string }>(
    "SELECT ean FROM product_ean WHERE chain_product_ref = '108293' ORDER BY ean",
  );
  // Calve Pindakaas 350 g. 8711200428953 is its primary EAN, and Jumbo's
  // Calvé Pindakaas Regular 350 g carries the same one.
  assert.equal(rows.length, 3);
  assert.ok(rows.some((r) => r.ean === "8711200428953"));
});

test("keeps the brand, and its absence", async () => {
  await ingestVomar();
  assert.equal((await product("122576")).brand, "G'woon");
  assert.equal((await product("738859")).brand, null);
});

test("files each product under its department, main group and subgroup", async () => {
  await ingestVomar();
  assert.deepEqual((await product("122576")).categories, ["Voorraadkast > Broodbeleg > Hartig Broodbeleg"]);
  assert.deepEqual((await product("135204")).categories, ["Vers > Zuivel, Boter & Eieren > Biologisch"]);
});

test("never reads the image file names the gateway sends", async () => {
  const { reading } = await ingestVomar();
  // Every recorded row carries `images`; nothing of it may reach a reading
  // (ADR-0003).
  assert.ok(!JSON.stringify(reading).includes("product-images"));
});
