import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { truncateAll, type Db } from "../src/ingest/db.ts";
import { record } from "../src/ingest/record.ts";
import { jumboReader } from "../src/ingest/readers/jumbo.ts";
import { testDb } from "./helpers/db.ts";
import { writeFixtureArchive, FIXTURE_DATE } from "./helpers/archive.ts";

/**
 * Jumbo is the opposite data-quality case to Dirk: it publishes an EAN and a
 * pre-computed Unit Price, and its prices are national.
 *
 * These run against a fixture built to the documented response shape, NOT
 * against a recorded response. Jumbo's edge tarpits an honest client, so no
 * real Jumbo response has ever been archived. The field names are the
 * archiver's verified selection set; the envelope around them is unconfirmed.
 * That limitation is recorded here rather than papered over, because a test
 * that passes against a fixture of our own invention proves less than one
 * recorded from the Chain.
 */

let db: Db;
before(async () => { db = await testDb(); });
beforeEach(async () => { await truncateAll(db); });
after(async () => { await db.end(); });

const JUMBO_FIXTURES = {
  jumbo: {
    "products/cat-1": ["jumbo-products.json"],
    promotions: ["jumbo-promotions.json"],
  },
};

async function ingestJumbo() {
  const root = await writeFixtureArchive(JUMBO_FIXTURES);
  const reading = await jumboReader.read(root, FIXTURE_DATE);
  return record(db, "jumbo", FIXTURE_DATE, reading);
}

test("stores the chain's own unit price rather than deriving one", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{
    unit_price_cents: number; comparison_unit: string; unit_price_source: string;
  }>(
    `SELECT unit_price_cents, comparison_unit, unit_price_source
       FROM price_observation WHERE chain_product_ref = '59938PAK'`,
  );
  // 12 x 250ml is 3 l, so our own figure would be 1399/3 = 466 c/l. Jumbo
  // publishes 350 c/l, and theirs is what they represent at the shelf, so
  // theirs is what we keep.
  assert.deepEqual(rows[0], {
    unit_price_cents: 350,
    comparison_unit: "l",
    unit_price_source: "chain",
  });
});

test("records prices as sent, in integer cents", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ shelf_price_cents: number; offer_price_cents: number }>(
    `SELECT shelf_price_cents, offer_price_cents
       FROM price_observation WHERE chain_product_ref = '59938PAK'`,
  );
  assert.deepEqual(rows[0], { shelf_price_cents: 1399, offer_price_cents: 1049 });
});

test("records prices as applying across the chain, with no store", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ store_ref: string | null }>(
    "SELECT DISTINCT store_ref FROM price_observation",
  );
  // NULL means national here, and no placeholder Store row is invented to
  // make Jumbo look like Dirk.
  assert.deepEqual(rows, [{ store_ref: null }]);
});

test("records the ean, and the absence of one", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ chain_product_ref: string; ean: string }>(
    "SELECT chain_product_ref, ean FROM product_ean ORDER BY chain_product_ref",
  );
  const byRef = Object.fromEntries(rows.map((r) => [r.chain_product_ref, r.ean]));
  assert.equal(byRef["59938PAK"], "8712000030957");
  assert.equal(byRef["498518PAK"], "8717228611711");
  // This one's ean was null; no row is written rather than an empty string.
  assert.equal("710779STK" in byRef, false);
});

test("records one observation per product per run, not one per category", async () => {
  const result = await ingestJumbo();
  const { rows } = await db.query<{ n: string }>(
    "SELECT count(*) AS n FROM price_observation WHERE chain_product_ref = '59938PAK'",
  );
  // The fixture returns this sku twice, as overlapping categories do.
  assert.equal(Number(rows[0]!.n), 1);
  assert.equal(result.counts.productsSeen, 5);
  assert.equal(result.counts.productsRecorded, 4);
});

test("leaves the unit price unset when the chain publishes none", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{
    unit_price_cents: number | null; unit_price_source: string | null; comparison_unit: string | null;
  }>(
    `SELECT unit_price_cents, unit_price_source, comparison_unit
       FROM price_observation WHERE chain_product_ref = '620416TRA'`,
  );
  // No pricePerUnit was sent. We do not quietly substitute our own figure,
  // but the pack size parsed out of the title is still recorded.
  assert.equal(rows[0]!.unit_price_cents, null);
  assert.equal(rows[0]!.unit_price_source, null);
  assert.equal(rows[0]!.comparison_unit, "kg");
});

test("leaves an unrecognised comparison unit unmapped", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ comparison_unit: string | null; unit_price_cents: number }>(
    `SELECT comparison_unit, unit_price_cents
       FROM price_observation WHERE chain_product_ref = '710779STK'`,
  );
  // The chain said "bundel". Guessing it means a piece would let a
  // per-bundle price be compared against a per-piece one.
  assert.equal(rows[0]!.comparison_unit, null);
  assert.equal(rows[0]!.unit_price_cents, 149);
});

test("keeps offer mechanics as the words the chain wrote", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ wording: string; headline: string }>(
    "SELECT wording, headline FROM offer_observation WHERE chain_offer_ref = '3021014'",
  );
  // Tag text, joined and otherwise untouched. Nothing converts "1+1 gratis"
  // into a percentage, because the effective unit price of a Dutch Offer
  // depends on how many you buy (ADR-0002).
  assert.equal(rows[0]!.wording, "1+1 gratis · Alleen online");
  assert.equal(rows[0]!.headline, "Redefine Meat, Oma's of Impossible Meat vleesvervangers");
});

test("parses the bracketed timezone and flags next week's offer", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{
    chain_offer_ref: string; is_upcoming: boolean; starts_at: Date; ends_at: Date;
  }>("SELECT chain_offer_ref, is_upcoming, starts_at, ends_at FROM offer_observation ORDER BY chain_offer_ref");

  const running = rows.find((r) => r.chain_offer_ref === "3021014")!;
  const next = rows.find((r) => r.chain_offer_ref === "3021099")!;
  assert.equal(running.is_upcoming, false);
  assert.equal(running.starts_at.toISOString(), "2026-10-06T22:01:00.000Z");
  // Visible before it begins, which is what offer-driven meal planning needs.
  assert.equal(next.is_upcoming, true);
  assert.equal(next.starts_at.toISOString(), "2026-10-13T22:01:00.000Z");
  assert.equal(next.ends_at.toISOString(), "2026-10-20T21:59:59.000Z");
});

test("links offers to the skus they apply to", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ chain_product_ref: string }>(
    `SELECT op.chain_product_ref FROM offer_product op
       JOIN offer_observation o ON o.id = op.offer_observation_id
      WHERE o.chain_offer_ref = '3021014' ORDER BY 1`,
  );
  assert.deepEqual(rows.map((r) => r.chain_product_ref), ["620416TRA", "710779STK"]);
});
