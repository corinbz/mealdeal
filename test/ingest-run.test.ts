import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { truncateAll, type Db } from "../src/ingest/db.ts";
import { record, DEFAULT_OPTIONS } from "../src/ingest/record.ts";
import { dirkReader } from "../src/ingest/readers/dirk.ts";
import { jumboReader } from "../src/ingest/readers/jumbo.ts";
import type { ChainReading } from "../src/ingest/readers/types.ts";
import { testDb } from "./helpers/db.ts";
import { writeFixtureArchive, writeEmptyArchive, FIXTURE_DATE } from "./helpers/archive.ts";

/** How a run behaves, as distinct from what either Chain's data looks like. */

let db: Db;
before(async () => { db = await testDb(); });
beforeEach(async () => { await truncateAll(db); });
after(async () => { await db.end(); });

const FULL = {
  dirk: {
    "products/store-66/wg-1": ["dirk-products.real.json", "dirk-products.edge.json"],
    "offers/store-66/dept-1": ["dirk-offers.edge.json"],
  },
};
const NEARLY_EMPTY = {
  dirk: { "products/store-66/wg-1": ["dirk-products.edge.json"] },
};

async function ingest(fixtures: object, options = DEFAULT_OPTIONS) {
  const root = await writeFixtureArchive(fixtures as never);
  const reading = await dirkReader.read(root, FIXTURE_DATE);
  return record(db, "dirk", FIXTURE_DATE, reading, options);
}

test("refuses to update an observation, because history cannot be rebuilt", async () => {
  await ingest(FULL);
  await assert.rejects(
    () => db.query("UPDATE price_observation SET shelf_price_cents = 1 WHERE id = 1"),
    /append-only/,
  );
});

test("refuses to delete an observation", async () => {
  await ingest(FULL);
  await assert.rejects(
    () => db.query("DELETE FROM price_observation WHERE id = 1"),
    /append-only/,
  );
  await assert.rejects(
    () => db.query("DELETE FROM offer_observation WHERE id = 1"),
    /append-only/,
  );
});

test("accumulates history instead of overwriting yesterday", async () => {
  const first = await ingest(FULL);
  const second = await ingest(FULL);
  assert.notEqual(first.runId, second.runId);

  const { rows } = await db.query<{ n: string }>(
    "SELECT count(*) AS n FROM price_observation WHERE chain_product_ref = '900001'",
  );
  // Two runs, two observations. The second did not replace the first.
  assert.equal(Number(rows[0]!.n), 2);

  const { rows: products } = await db.query<{ n: string }>(
    "SELECT count(*) AS n FROM product WHERE chain_product_ref = '900001'",
  );
  // The Product's description is current rather than historical, so it stays
  // one row carrying the latest wording.
  assert.equal(Number(products[0]!.n), 1);
});

test("rejects a run that records far fewer products than the last", async () => {
  const baseline = await ingest(FULL);
  const dropped = await ingest(NEARLY_EMPTY);

  assert.equal(dropped.outcome, "rejected");
  assert.match(dropped.notes ?? "", /below the/);
  assert.ok(
    dropped.counts.productsRecorded < baseline.counts.productsRecorded,
    "precondition: the second run really is smaller",
  );

  // Nothing from the rejected run was ingested: a Chain changing its API
  // shape must not quietly become a day of missing prices.
  const { rows } = await db.query<{ n: string }>(
    "SELECT count(DISTINCT run_id) AS n FROM price_observation",
  );
  assert.equal(Number(rows[0]!.n), 1);
});

test("records the rejection itself, so a silent failure is visible", async () => {
  await ingest(FULL);
  await ingest(NEARLY_EMPTY);

  const { rows } = await db.query<{ outcome: string; notes: string }>(
    "SELECT outcome, notes FROM ingest_run ORDER BY id DESC LIMIT 1",
  );
  assert.equal(rows[0]!.outcome, "rejected");
  assert.match(rows[0]!.notes, /A Chain changing its API shape/);
});

test("accepts a flagged run when the catalogue genuinely shrank", async () => {
  await ingest(FULL);
  const forced = await ingest(NEARLY_EMPTY, { minVolumeRatio: 0.5, force: true });

  assert.equal(forced.outcome, "complete");
  assert.match(forced.notes ?? "", /forced/);
  const { rows } = await db.query<{ n: string }>(
    "SELECT count(DISTINCT run_id) AS n FROM price_observation",
  );
  assert.equal(Number(rows[0]!.n), 2);
});

test("does not apply the volume alarm to a chain's first run", async () => {
  // With no previous run there is nothing to compare against, and refusing
  // the first run would mean never starting.
  const first = await ingest(NEARLY_EMPTY);
  assert.equal(first.outcome, "complete");
});

test("counts a graphql error as a parse failure and still records the rest", async () => {
  const root = await writeFixtureArchive({
    jumbo: {
      "products/cat-1": ["jumbo-products.json"],
      "products/cat-2": ["graphql-error.json"],
      promotions: ["jumbo-promotions.json"],
    },
  });
  const reading = await jumboReader.read(root, FIXTURE_DATE);
  const result = await record(db, "jumbo", FIXTURE_DATE, reading);

  assert.equal(result.outcome, "complete");
  assert.equal(result.counts.parseFailures, 1);
  assert.match(result.notes ?? "", /parse failure/);
  // The failing category did not take the working one down with it.
  assert.equal(result.counts.productsRecorded, 6);
});

test("records nothing, and says so, when the archive holds no responses", async () => {
  const root = await writeEmptyArchive();
  const reading = await dirkReader.read(root, FIXTURE_DATE);
  const result = await record(db, "dirk", FIXTURE_DATE, reading);

  // Completing with zero products is the shape of a silent failure, so the
  // CLI treats it as a non-zero exit. Here we assert the counts are honest.
  assert.equal(result.counts.productsSeen, 0);
  assert.equal(result.counts.productsRecorded, 0);
  assert.equal(result.counts.offersRecorded, 0);
});

test("stores several eans for one product", async () => {
  // No Chain in the archive sends an array today, but two of the assessed
  // Chains do, so the schema models it as many-to-one from the start rather
  // than needing a migration later.
  const reading: ChainReading = {
    prices: [
      {
        chainProductRef: "multi-ean-1",
        name: "Vomar Halfvolle Melk 1 L",
        brand: "Vomar",
        packText: "1 l",
        pack: { quantity: 1, unit: "l" },
        isWeightProduct: false,
        eans: ["8710398526694", "8710398526410"],
        storeRef: null,
        observedAt: new Date("2026-10-13T08:00:00Z"),
        shelfPriceCents: 129,
        offerPriceCents: null,
        unitPriceCents: 129,
        comparisonUnit: "l",
        unitPriceSource: "derived",
      },
    ],
    offers: [],
    productsSeen: 1,
    withoutUnitPrice: 0,
    parseFailures: [],
  };
  await record(db, "dirk", FIXTURE_DATE, reading);

  const { rows } = await db.query<{ ean: string }>(
    "SELECT ean FROM product_ean WHERE chain_product_ref = 'multi-ean-1' ORDER BY ean",
  );
  assert.deepEqual(rows.map((r) => r.ean), ["8710398526410", "8710398526694"]);
});

test("reports the counts a run needs to be trusted", async () => {
  const result = await ingest(FULL);
  const { rows } = await db.query<{
    products_seen: number; products_recorded: number; prices_recorded: number;
    offers_recorded: number; without_unit_price: number; outcome: string;
  }>("SELECT * FROM ingest_run WHERE id = $1", [result.runId]);

  const run = rows[0]!;
  assert.equal(run.outcome, "complete");
  assert.equal(Number(run.products_recorded), result.counts.productsRecorded);
  assert.equal(Number(run.prices_recorded), result.counts.pricesRecorded);
  assert.equal(Number(run.offers_recorded), 2);
  // One fixture product states no quantity anywhere.
  assert.equal(Number(run.without_unit_price), 1);
  assert.ok(Number(run.products_seen) > Number(run.products_recorded));
});
