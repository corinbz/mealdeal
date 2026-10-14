import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { truncateAll, type Db } from "../src/ingest/db.ts";
import { record } from "../src/ingest/record.ts";
import { hoogvlietReader, offerInstant, categoryPaths } from "../src/ingest/readers/hoogvliet.ts";
import { skusOf, PRODUCTS_QUERY } from "../src/archive/chains/hoogvliet.ts";
import { assertNoBannedFields } from "../src/archive/guard.ts";
import { testDb } from "./helpers/db.ts";
import { writeFixtureArchive } from "./helpers/archive.ts";

/**
 * Hoogvliet (#29): Magento's GraphQL behind hoogvliet.nl. National prices,
 * EANs, Hoogvliet's own Unit Price, Offers on Products and the folder's
 * tiles weeks ahead.
 *
 * Every row here was RECORDED from hoogvliet.nl/api/graphql on 2026-10-14,
 * eleven of 9,489, each picked for a case the catalogue contains.
 */

const DATE = "2026-10-14";

let db: Db;
before(async () => { db = await testDb(); });
beforeEach(async () => { await truncateAll(db); });
after(async () => { await db.end(); });

async function ingestHoogvliet() {
  const root = await writeFixtureArchive({ hoogvliet: { "products/from-fixture": ["hoogvliet-products.json"] } }, DATE);
  const reading = await hoogvlietReader.read(root, DATE);
  return { reading, result: await record(db, "hoogvliet", DATE, reading) };
}

async function observation(ref: string) {
  const { rows } = await db.query<{
    name: string; brand: string | null; pack_text: string | null; is_weight_product: boolean; categories: string[];
    store_ref: string | null; shelf_price_cents: number; offer_price_cents: number | null;
    unit_price_cents: number | null; comparison_unit: string | null; unit_price_source: string | null;
  }>(
    `SELECT p.name, p.brand, p.pack_text, p.is_weight_product, p.categories, o.store_ref, o.shelf_price_cents,
            o.offer_price_cents, o.unit_price_cents, o.comparison_unit, o.unit_price_source
       FROM product p JOIN price_observation o USING (chain_id, chain_product_ref)
      WHERE p.chain_id = 'hoogvliet' AND p.chain_product_ref = $1`,
    [ref],
  );
  return rows[0];
}

async function offer(ref: string) {
  const { rows } = await db.query<{
    headline: string | null; wording: string | null; starts_at: Date; ends_at: Date; is_upcoming: boolean; products: string[];
  }>(
    `SELECT o.headline, o.wording, o.starts_at, o.ends_at, o.is_upcoming,
            array_remove(array_agg(op.chain_product_ref ORDER BY op.chain_product_ref), NULL) AS products
       FROM offer_observation o LEFT JOIN offer_product op ON op.offer_observation_id = o.id
      WHERE o.chain_offer_ref = $1 GROUP BY o.id`,
    [ref],
  );
  return rows[0];
}

test("records national prices with EANs, and passes over what is sold online only", async () => {
  const { result } = await ingestHoogvliet();
  // Eight Products and three folder tiles; the sunscreen is online only.
  assert.equal(result.counts.productsSeen, 8);
  assert.equal(result.counts.productsRecorded, 7);
  assert.equal(result.counts.parseFailures, 0);
  assert.equal(await observation("065004000"), undefined);
  assert.deepEqual((await db.query("SELECT DISTINCT store_ref FROM price_observation")).rows, [{ store_ref: null }]);
  const { rows } = await db.query("SELECT ean FROM product_ean WHERE chain_product_ref = '718988000'");
  assert.deepEqual(rows, [{ ean: "8718989000660" }]);
});

test("reads the pack from its two fields, and keeps Hoogvliet's Unit Price at the Shelf Price", async () => {
  await ingestHoogvliet();
  const friet = await observation("718988000");
  assert.deepEqual(
    [friet!.brand, friet!.pack_text, friet!.shelf_price_cents, friet!.offer_price_cents, friet!.unit_price_cents, friet!.comparison_unit, friet!.unit_price_source],
    ["G'woon", "1 Kilo", 229, null, 229, "kg", "chain"],
  );
  // A one-kilo bag, not something weighed at the till.
  assert.equal(friet!.is_weight_product, false);
});

test("a reduced price is the Offer price, with a Unit Price derived from it", async () => {
  await ingestHoogvliet();
  // Hoogvliet's 3.13 a piece is on the Shelf Price; 1.89 is paid.
  const pizza = await observation("000016000");
  assert.deepEqual([pizza!.shelf_price_cents, pizza!.offer_price_cents, pizza!.unit_price_cents, pizza!.unit_price_source],
    [313, 189, 189, "derived"]);
  const o = await offer("202642139");
  assert.deepEqual([o!.wording, o!.products], ["per stuk 1,89", ["000016000"]]);
  assert.equal(o!.starts_at.toISOString(), "2026-10-13T20:00:00.000Z");
  assert.equal(o!.ends_at.toISOString(), "2026-10-20T19:59:00.000Z");
  // "50% korting": 1.75 to 0.88, Hoogvliet's own figure, 20 bags at 4 cents.
  const thee = await observation("003026000");
  assert.deepEqual([thee!.shelf_price_cents, thee!.offer_price_cents, thee!.unit_price_cents], [175, 88, 4]);
});

test("a deal with no price of its own stays in the wording, under the folder's headline", async () => {
  await ingestHoogvliet();
  const boerenkool = await observation("026125000");
  assert.deepEqual([boerenkool!.shelf_price_cents, boerenkool!.offer_price_cents, boerenkool!.unit_price_cents], [308, null, 453]);
  const hak = await offer("202642031");
  assert.deepEqual([hak!.headline, hak!.wording, hak!.is_upcoming, hak!.products], ["Hak", "1 + 1 Gratis", false, ["026125000"]]);
  // All year, and in no folder.
  const rookworst = await offer("260028");
  assert.deepEqual([rookworst!.headline, rookworst!.wording, rookworst!.products], [null, "2 voor 6,00", ["083531000"]]);
});

test("records next week's folder before it starts, and not last week's", async () => {
  await ingestHoogvliet();
  const wine = await offer("202643001");
  assert.deepEqual([wine!.headline, wine!.wording, wine!.is_upcoming, wine!.products],
    ["Favoritos reserva, Mas a tierra of Puglia rosso", "per fles 4,99", true, []]);
  // Wednesday 21 October to Tuesday 27 October, Amsterdam days either side of the clock change.
  assert.equal(wine!.starts_at.toISOString(), "2026-10-20T22:00:00.000Z");
  assert.equal(wine!.ends_at.toISOString(), "2026-10-27T22:59:59.000Z");
  assert.equal(await offer("202641002"), undefined);
});

test("files a Product on its own shelf, not the season's", async () => {
  await ingestHoogvliet();
  assert.deepEqual((await observation("000043000"))!.categories, ["Koffie, thee > Koffie > Filterkoffie"]);
  // On a seasonal shelf only, that one is all there is.
  assert.deepEqual(categoryPaths([{ name: "Feestdagen", level: 2, url_path: "feestdagen" }, { name: "Borrel", level: 3, url_path: "feestdagen/borrel" }]),
    ["Feestdagen > Borrel"]);
});

test("a Unit Price per roll compares with nothing", async () => {
  const { result } = await ingestHoogvliet();
  const rollen = await observation("058439000");
  assert.deepEqual([rollen!.pack_text, rollen!.unit_price_cents], ["4 Rol", null]);
  assert.equal(result.counts.withoutUnitPrice, 1);
});

test("reads both ways Hoogvliet writes an instant", () => {
  assert.equal(offerInstant("2026-10-13T20:00:00+00:00")!.toISOString(), "2026-10-13T20:00:00.000Z");
  assert.equal(offerInstant("2026-11-11 00:00:00.000")!.toISOString(), "2026-11-10T23:00:00.000Z");
  assert.equal(offerInstant("2026-11-17 23:59:00.000", true)!.toISOString(), "2026-11-17T22:59:59.000Z");
  assert.equal(offerInstant(null), null);
});

test("the archiver takes skus from product pages only, and asks for no supplier text", () => {
  const sitemap = `<urlset><url><loc>https://hoogvliet.nl/diepvries/pizza</loc></url>
    <url><loc>https://hoogvliet.nl/g-apos-woon-kreukelfriet-718988000</loc></url>
    <url><loc>https://hoogvliet.nl/hak-202642031</loc></url>
    <url><loc>https://hoogvliet.nl/g-apos-woon-kreukelfriet-718988000</loc></url></urlset>`;
  assert.deepEqual(skusOf(sitemap), ["202642031", "718988000"]);
  assert.doesNotThrow(() => assertNoBannedFields(PRODUCTS_QUERY, "hoogvliet"));
  assert.throws(() => assertNoBannedFields("{ items { metadata } }", "hoogvliet"));
});
