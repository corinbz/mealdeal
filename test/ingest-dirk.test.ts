import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { truncateAll, type Db } from "../src/ingest/db.ts";
import { record } from "../src/ingest/record.ts";
import { dirkReader } from "../src/ingest/readers/dirk.ts";
import { testDb } from "./helpers/db.ts";
import { writeFixtureArchive, FIXTURE_DATE } from "./helpers/archive.ts";

/**
 * One seam: the archive directory.
 *
 * Each test drives a full ingest run — read, normalise, persist — and asserts
 * what ended up in Postgres. Nothing here asserts how many files were opened,
 * which function was called, or what an intermediate value looked like. The
 * observable behaviour is "after a run, the store contains these rows".
 */

let db: Db;
before(async () => { db = await testDb(); });
beforeEach(async () => { await truncateAll(db); });
after(async () => { await db.end(); });

const DIRK_FIXTURES = {
  dirk: {
    "products/store-66/wg-1": ["dirk-products.real.json", "dirk-products.edge.json"],
    "offers/store-66/dept-1": ["dirk-offers.real.json", "dirk-offers.edge.json"],
  },
};

async function ingestDirk() {
  const root = await writeFixtureArchive(DIRK_FIXTURES);
  const reading = await dirkReader.read(root, FIXTURE_DATE);
  return record(db, "dirk", FIXTURE_DATE, reading);
}

test("records products with prices, and reports what it recorded", async () => {
  const result = await ingestDirk();

  assert.equal(result.outcome, "complete");
  const { rows } = await db.query<{ n: string }>(
    "SELECT count(*) AS n FROM price_observation",
  );
  assert.equal(Number(rows[0]!.n), result.counts.pricesRecorded);
  assert.ok(result.counts.pricesRecorded >= 16, "the fixtures carry at least 16 priced rows");
  // Products seen exceeds products recorded: the Chain returns a null in
  // place of any Product the Store does not stock, which is a real
  // observation about assortment rather than an error.
  assert.ok(
    result.counts.productsSeen > result.counts.productsRecorded,
    "null rows are counted as seen but yield no price",
  );
});

test("derives a unit price, because Dirk publishes none", async () => {
  await ingestDirk();
  const { rows } = await db.query<{
    unit_price_cents: number; comparison_unit: string; unit_price_source: string;
  }>(
    `SELECT unit_price_cents, comparison_unit, unit_price_source
       FROM price_observation WHERE chain_product_ref = '900001'`,
  );
  // 2 liter at EUR 1.54 is EUR 0.77 per litre.
  assert.deepEqual(rows[0], {
    unit_price_cents: 77,
    comparison_unit: "l",
    unit_price_source: "derived",
  });
});

test("treats an offer price of zero as no offer, not as free", async () => {
  await ingestDirk();
  const { rows } = await db.query<{ shelf_price_cents: number; offer_price_cents: number | null }>(
    `SELECT shelf_price_cents, offer_price_cents
       FROM price_observation WHERE chain_product_ref = '900001'`,
  );
  assert.deepEqual(rows[0], { shelf_price_cents: 154, offer_price_cents: null });
});

test("records a real offer price when there is one", async () => {
  await ingestDirk();
  const { rows } = await db.query<{
    shelf_price_cents: number; offer_price_cents: number; unit_price_cents: number;
  }>(
    `SELECT shelf_price_cents, offer_price_cents, unit_price_cents
       FROM price_observation WHERE chain_product_ref = '900004'`,
  );
  // 24 x 300ml is 7.2 l; the Unit Price follows the offer price, EUR 3.99.
  assert.deepEqual(rows[0], {
    shelf_price_cents: 499,
    offer_price_cents: 399,
    unit_price_cents: 55,
  });
});

test("falls back to the name when packaging states no quantity", async () => {
  await ingestDirk();
  const { rows } = await db.query<{
    pack_text: string; pack_quantity: string; unit_price_cents: number;
  }>(
    `SELECT p.pack_text, p.pack_quantity, o.unit_price_cents
       FROM product p JOIN price_observation o USING (chain_id, chain_product_ref)
      WHERE p.chain_product_ref = '900002'`,
  );
  // Packaged as "Per schaal", but the name says 500 gram.
  assert.equal(rows[0]!.pack_text, "Per schaal");
  assert.equal(Number(rows[0]!.pack_quantity), 0.5);
  assert.equal(rows[0]!.unit_price_cents, 550);
});

test("keeps a product whose pack size cannot be parsed, and counts it", async () => {
  const result = await ingestDirk();
  const { rows } = await db.query<{
    pack_text: string; pack_quantity: string | null; unit_price_cents: number | null;
    shelf_price_cents: number;
  }>(
    `SELECT p.pack_text, p.pack_quantity, o.unit_price_cents, o.shelf_price_cents
       FROM product p JOIN price_observation o USING (chain_id, chain_product_ref)
      WHERE p.chain_product_ref = '900003'`,
  );
  // Recorded with a Shelf Price and no Unit Price: not a comparison
  // candidate, but never dropped from the catalogue. Its wording is kept so a
  // better parser can recover it without re-scraping a day that has passed.
  assert.equal(rows[0]!.pack_text, "Per bos");
  assert.equal(rows[0]!.pack_quantity, null);
  assert.equal(rows[0]!.unit_price_cents, null);
  assert.equal(rows[0]!.shelf_price_cents, 349);
  assert.ok(result.counts.withoutUnitPrice >= 1, "the gap is measured, not hidden");
});

test("records weight-priced products as such", async () => {
  await ingestDirk();
  const { rows } = await db.query<{ is_weight_product: boolean }>(
    "SELECT is_weight_product FROM product WHERE chain_product_ref = '900005'",
  );
  assert.equal(rows[0]!.is_weight_product, true);
});

test("scopes every price to the store it was fetched for", async () => {
  await ingestDirk();
  const { rows } = await db.query<{ store_ref: string | null; n: string }>(
    "SELECT store_ref, count(*) AS n FROM price_observation GROUP BY store_ref",
  );
  // Dirk's prices are genuinely per-Store, so none may be recorded as
  // applying across the Chain.
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.store_ref, "66");
});

test("records no EANs, because Dirk's schema has no EAN field", async () => {
  await ingestDirk();
  const { rows } = await db.query<{ n: string }>("SELECT count(*) AS n FROM product_ean");
  assert.equal(Number(rows[0]!.n), 0);
});

test("keeps offer wording verbatim and derives nothing from it", async () => {
  await ingestDirk();
  const { rows } = await db.query<{ wording: string; headline: string; ends_at: Date | null }>(
    `SELECT wording, headline, ends_at FROM offer_observation
      WHERE chain_offer_ref = '990001'`,
  );
  assert.equal(rows[0]!.wording, "2 voor 6,00");
  assert.equal(rows[0]!.headline, "Dubbelfrisss");
  // The far-future end date is Dirk's open-ended sentinel, not a date.
  assert.equal(rows[0]!.ends_at, null);
});

test("records an announced offer that has not started yet", async () => {
  await ingestDirk();
  const { rows } = await db.query<{ wording: string; is_upcoming: boolean; starts_at: Date }>(
    `SELECT wording, is_upcoming, starts_at FROM offer_observation
      WHERE chain_offer_ref = '990002'`,
  );
  assert.equal(rows[0]!.is_upcoming, true);
  assert.equal(rows[0]!.wording, "1+1 gratis");
  assert.equal(rows[0]!.starts_at.toISOString(), "2026-10-13T22:00:00.000Z");
});

test("links an offer to the products it applies to", async () => {
  await ingestDirk();
  const { rows } = await db.query<{ chain_product_ref: string }>(
    `SELECT op.chain_product_ref FROM offer_product op
       JOIN offer_observation o ON o.id = op.offer_observation_id
      WHERE o.chain_offer_ref = '990001'`,
  );
  assert.deepEqual(rows.map((r) => r.chain_product_ref), ["900004"]);
});

test("records one observation per product per store, not one per web group", async () => {
  // The same Product sits in several web groups, so it arrives several times
  // in one run. Against the real archived day this collapsed 1005 rows to 963.
  const root = await writeFixtureArchive({
    dirk: {
      "products/store-66/wg-1": ["dirk-products.edge.json"],
      "products/store-66/wg-2": ["dirk-products.edge.json"],
    },
  });
  const reading = await dirkReader.read(root, FIXTURE_DATE);
  const result = await record(db, "dirk", FIXTURE_DATE, reading);

  const { rows } = await db.query<{ n: string }>(
    "SELECT count(*) AS n FROM price_observation WHERE chain_product_ref = '900001'",
  );
  assert.equal(Number(rows[0]!.n), 1);
  assert.equal(result.counts.pricesRecorded, result.counts.productsRecorded);
  // Both appearances are still counted as seen: the duplication is a fact
  // about the Chain's catalogue worth keeping in the report.
  assert.equal(result.counts.productsSeen, 10);
});
