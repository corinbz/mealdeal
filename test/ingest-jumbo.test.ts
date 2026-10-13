import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { truncateAll, type Db } from "../src/ingest/db.ts";
import { record } from "../src/ingest/record.ts";
import { jumboReader } from "../src/ingest/readers/jumbo.ts";
import { testDb } from "./helpers/db.ts";
import { writeFixtureArchive, FIXTURE_DATE } from "./helpers/archive.ts";

/**
 * Jumbo is the opposite data-quality case to Dirk: it publishes an EAN and a
 * pre-computed Unit Price, and its prices are national rather than per-Store.
 *
 * Every product row these tests assert against was RECORDED from
 * www.jumbo.com/api/graphql on 2026-10-13, bar one — in 254 recorded rows,
 * `pricePerUnit` was never null, so a Chain publishing no Unit Price for a
 * Product is a case we have not observed and cannot record. That row is
 * marked constructed in the fixture.
 *
 * This matters more than the usual fixture hygiene. The first version of this
 * file passed against a wholly invented fixture that guessed `stuk` for the
 * piece unit. Jumbo actually sends `pieces`, so every piece-priced Product
 * would have had its Comparison Unit silently dropped — nothing failing, the
 * rows just quietly ceasing to be comparison candidates. One real response
 * caught what twelve passing tests had agreed about.
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
       FROM price_observation WHERE chain_product_ref = '767568ZK'`,
  );
  // Jumbo Opbakaardappelen 425 g at EUR 1.94 would derive to 456 c/kg by
  // coincidence here, but the point stands: we record THEIR figure and mark
  // it as theirs, because that is what they represent at the shelf.
  assert.deepEqual(rows[0], {
    unit_price_cents: 456,
    comparison_unit: "kg",
    unit_price_source: "chain",
  });
});

test("records prices as sent, in integer cents", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ shelf_price_cents: number; offer_price_cents: number }>(
    `SELECT shelf_price_cents, offer_price_cents
       FROM price_observation WHERE chain_product_ref = '767568ZK'`,
  );
  assert.deepEqual(rows[0], { shelf_price_cents: 259, offer_price_cents: 194 });
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

test("maps the piece unit spelling the chain actually sends", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ comparison_unit: string; unit_price_cents: number }>(
    `SELECT comparison_unit, unit_price_cents
       FROM price_observation WHERE chain_product_ref = '302241PAK'`,
  );
  // Jumbo says "pieces", not "stuk". See the note at the top of this file.
  assert.deepEqual(rows[0], { comparison_unit: "piece", unit_price_cents: 53 });
});

test("records the ean, and the absence of one", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ chain_product_ref: string; ean: string }>(
    "SELECT chain_product_ref, ean FROM product_ean ORDER BY chain_product_ref",
  );
  const byRef = Object.fromEntries(rows.map((r) => [r.chain_product_ref, r.ean]));
  assert.equal(byRef["302241PAK"], "8711715882431");
  assert.equal(byRef["767568ZK"], "8726900020116");
  // Loose produce carries no ean. No row is written rather than a blank one,
  // so "has no EAN" stays distinguishable from "has an empty one".
  assert.equal("526991STK" in byRef, false);
});

test("records a product whose title states no pack size", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ pack_quantity: string | null; comparison_unit: string }>(
    `SELECT p.pack_quantity, o.comparison_unit
       FROM product p JOIN price_observation o USING (chain_id, chain_product_ref)
      WHERE p.chain_product_ref = '526991STK'`,
  );
  // "Jumbo Komkommer" — loose produce, no quantity anywhere in the title.
  // The Chain's own Unit Price still makes it comparable, which is the whole
  // reason we prefer their figure to one of ours.
  assert.equal(rows[0]!.pack_quantity, null);
  assert.equal(rows[0]!.comparison_unit, "piece");
});

test("leaves an unstated comparison unit unmapped", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ comparison_unit: string | null; unit_price_cents: number | null }>(
    `SELECT comparison_unit, unit_price_cents
       FROM price_observation WHERE chain_product_ref = '375023STK'`,
  );
  // This row's pricePerUnit.unit is null in the real response. Guessing it
  // means a piece would let a per-something price be compared against a
  // per-piece one.
  assert.equal(rows[0]!.comparison_unit, null);
});

test("derives a weight price when the chain publishes none but the title states a weight", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{
    unit_price_cents: number | null; unit_price_source: string | null; comparison_unit: string | null;
  }>(
    `SELECT unit_price_cents, unit_price_source, comparison_unit
       FROM price_observation WHERE chain_product_ref = '620416TRA'`,
  );
  // No pricePerUnit was sent. "350 g" is in the title, and the owner's rule
  // (issue #3) is to compare by weight whenever a weight is known: EUR 1.89
  // over 0.35 kg, marked as our figure rather than the Chain's.
  assert.deepEqual(rows[0], { unit_price_cents: 540, unit_price_source: "derived", comparison_unit: "kg" });
});

test("compares by weight when the chain prices per piece but the title states a weight", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{
    unit_price_cents: number; unit_price_source: string; comparison_unit: string; pack_quantity: string; pack_unit: string;
  }>(
    `SELECT o.unit_price_cents, o.unit_price_source, o.comparison_unit, p.pack_quantity, p.pack_unit
       FROM product p JOIN price_observation o USING (chain_id, chain_product_ref)
      WHERE p.chain_product_ref = '81319ZK'`,
  );
  // "8 Stuks 320 g" at EUR 2.65. Jumbo's own figure is 33 c per piece; by
  // weight it is 828 c/kg. The pack is stored as 0.32 in kg -- it used to be
  // stored as 0.32 labelled "piece", so 8 tortillas came out as 25 packs.
  assert.deepEqual(rows[0], {
    unit_price_cents: 828, unit_price_source: "derived", comparison_unit: "kg", pack_quantity: "0.32", pack_unit: "kg",
  });
});

test("keeps the chain's weight price when the title counts pieces", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{
    unit_price_cents: number; unit_price_source: string; comparison_unit: string; pack_quantity: string; pack_unit: string;
  }>(
    `SELECT o.unit_price_cents, o.unit_price_source, o.comparison_unit, p.pack_quantity, p.pack_unit
       FROM product p JOIN price_observation o USING (chain_id, chain_product_ref)
      WHERE p.chain_product_ref = '718875DS'`,
  );
  // Soup sachets, "3 Stuks", priced by Jumbo per kg. The weight price is
  // theirs and stays; the pack is 3 pieces and says so, not 3 kg.
  assert.deepEqual(rows[0], {
    unit_price_cents: 736, unit_price_source: "chain", comparison_unit: "kg", pack_quantity: "3", pack_unit: "piece",
  });
});

test("compares by the piece only when no weight is known", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ comparison_unit: string; unit_price_source: string; pack_unit: string | null }>(
    `SELECT o.comparison_unit, o.unit_price_source, p.pack_unit
       FROM product p JOIN price_observation o USING (chain_id, chain_product_ref)
      WHERE p.chain_product_ref IN ('302241PAK', '526991STK') ORDER BY p.chain_product_ref`,
  );
  // "Paprika Mix 3 Stuks" and loose "Komkommer": no weight anywhere, so
  // Jumbo's own per-piece figure is what compares.
  assert.deepEqual(rows, [
    { comparison_unit: "piece", unit_price_source: "chain", pack_unit: "piece" },
    { comparison_unit: "piece", unit_price_source: "chain", pack_unit: null },
  ]);
});

test("records one observation per product per run, not one per category", async () => {
  const result = await ingestJumbo();
  const { rows } = await db.query<{ n: string }>(
    "SELECT count(*) AS n FROM price_observation WHERE chain_product_ref = '392550ZK'",
  );
  // This sku really does arrive twice in the recorded data, because Jumbo's
  // categories overlap.
  assert.equal(Number(rows[0]!.n), 1);
  assert.equal(result.counts.productsSeen, 9);
  assert.equal(result.counts.productsRecorded, 8);
});

test("keeps offer mechanics as the words the chain wrote", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ wording: string; headline: string }>(
    "SELECT wording, headline FROM offer_observation WHERE chain_offer_ref = '3021005'",
  );
  assert.equal(rows[0]!.wording, "1+1 gratis");
  assert.equal(rows[0]!.headline, "Page vochtig toiletpapier");
});

test("joins several tags without interpreting any of them", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ wording: string }>(
    "SELECT wording FROM offer_observation WHERE chain_offer_ref = '3022751'",
  );
  // "voor 1,09" is a price, "Alleen online" is a channel restriction. Neither
  // is a discount percentage, and a parser that tried to make one would be
  // wrong about both.
  assert.equal(rows[0]!.wording, "voor 1,09 · Alleen online");
});

test("stores no wording for a brand page whose only tag repeats its title", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ wording: string | null; headline: string }>(
    "SELECT wording, headline FROM offer_observation WHERE chain_offer_ref = '3020885'",
  );
  assert.equal(rows[0]!.wording, null);
  assert.equal(rows[0]!.headline, "Wayang");
});

test("keeps a tag that is only part of the title", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ wording: string }>(
    "SELECT wording FROM offer_observation WHERE chain_offer_ref = '3023008'",
  );
  assert.equal(rows[0]!.wording, "Gratis lepelsetje · Alleen online - OP=OP");
});

test("does not record a delivery perk as an Offer", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{ chain_offer_ref: string }>(
    "SELECT chain_offer_ref FROM offer_observation WHERE chain_offer_ref IN ('3021143', '3021237')",
  );
  // "Gratis bezorging · Vanaf € 12,00" and "€2,00 bezorgkorting · Bij elk
  // stuk" are terms for online delivery. No Product's price changes, so they
  // are not Offers, and shown in the deal slot they read as discounts.
  assert.deepEqual(rows, []);
  const { rows: kept } = await db.query<{ n: string }>("SELECT count(*) AS n FROM offer_observation");
  // The real Offers in the same response are all still recorded.
  assert.equal(Number(kept[0]!.n), 5);
});

test("parses the bracketed timezone and flags next week's offer", async () => {
  await ingestJumbo();
  const { rows } = await db.query<{
    chain_offer_ref: string; is_upcoming: boolean; starts_at: Date; ends_at: Date;
  }>("SELECT chain_offer_ref, is_upcoming, starts_at, ends_at FROM offer_observation ORDER BY chain_offer_ref");

  const running = rows.find((r) => r.chain_offer_ref === "3021005")!;
  const next = rows.find((r) => r.chain_offer_ref === "3021228")!;
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
      WHERE o.chain_offer_ref = '3022751' ORDER BY 1`,
  );
  assert.deepEqual(rows.map((r) => r.chain_product_ref), ["479521STK"]);
});
