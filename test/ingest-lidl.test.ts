import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { truncateAll, type Db } from "../src/ingest/db.ts";
import { record } from "../src/ingest/record.ts";
import { itemsOf, lidlReader, packBulletOf } from "../src/ingest/readers/lidl.ts";
import { testDb } from "./helpers/db.ts";
import { writeFixtureArchive } from "./helpers/archive.ts";

/**
 * Lidl (#28): the offers page, the only place Lidl prices food online.
 *
 * Every tile here was RECORDED from https://www.lidl.nl/c/aanbiedingen on
 * 2026-10-14, ten of 142, each picked for a case the page contains. Their
 * `data-grid-data` attributes are verbatim; only the page around them is cut.
 */

const DATE = "2026-10-14";

let db: Db;
before(async () => { db = await testDb(); });
beforeEach(async () => { await truncateAll(db); });
after(async () => { await db.end(); });

async function ingestLidl() {
  const root = await writeFixtureArchive({ lidl: { offers: ["lidl-offers.html"] } }, DATE);
  const reading = await lidlReader.read(root, DATE);
  return { reading, result: await record(db, "lidl", DATE, reading) };
}

async function observation(ref: string) {
  const { rows } = await db.query<{
    name: string; brand: string | null; pack_text: string | null; categories: string[]; store_ref: string | null;
    shelf_price_cents: number; offer_price_cents: number | null; unit_price_cents: number | null;
  }>(
    `SELECT p.name, p.brand, p.pack_text, p.categories, o.store_ref, o.shelf_price_cents, o.offer_price_cents, o.unit_price_cents
       FROM product p JOIN price_observation o USING (chain_id, chain_product_ref)
      WHERE p.chain_id = 'lidl' AND p.chain_product_ref = $1`,
    [ref],
  );
  return rows[0];
}

async function offerOf(ref: string) {
  const { rows } = await db.query<{ wording: string; headline: string; starts_at: Date; ends_at: Date; is_upcoming: boolean }>(
    `SELECT o.wording, o.headline, o.starts_at, o.ends_at, o.is_upcoming FROM offer_observation o
       JOIN offer_product op ON op.offer_observation_id = o.id WHERE op.chain_product_ref = $1`,
    [ref],
  );
  return rows;
}

test("records what the page prices, nationally, with no EANs", async () => {
  const { result } = await ingestLidl();
  assert.equal(result.counts.productsSeen, 10);
  assert.equal(result.counts.productsRecorded, 9);
  assert.equal(result.counts.parseFailures, 0);
  const { rows } = await db.query("SELECT DISTINCT store_ref FROM price_observation");
  assert.deepEqual(rows, [{ store_ref: null }]);
  assert.deepEqual((await db.query("SELECT * FROM product_ean")).rows, []);
});

test("a reduced price is the Offer price, and the price it was the Shelf Price", async () => {
  await ingestLidl();
  const druiven = await observation("11150885");
  assert.deepEqual([druiven!.shelf_price_cents, druiven!.offer_price_cents, druiven!.unit_price_cents, druiven!.pack_text],
    [239, 119, 238, "500 g"]);
  const [o] = await offerOf("11150885");
  assert.equal(o!.wording, "-50% · Mega deal!");
  // Monday 12 October to Sunday 18 October, whole Amsterdam days.
  assert.equal(o!.starts_at.toISOString(), "2026-10-11T22:00:00.000Z");
  assert.equal(o!.ends_at.toISOString(), "2026-10-18T21:59:59.000Z");
});

test("a product on the page at its price is a Shelf Price and no Offer", async () => {
  await ingestLidl();
  // A week's bakery: nothing struck through, nothing reduced.
  const stengels = await observation("11004749");
  assert.deepEqual([stengels!.shelf_price_cents, stengels!.offer_price_cents, stengels!.brand], [49, null, null]);
  assert.deepEqual(await offerOf("11004749"), []);
});

test("a Lidl Plus price counts as paid, as if the shopper had the app", async () => {
  await ingestLidl();
  // The owner's choice (2026-10-14): every Chain's card and app prices count.
  // Mandarins: 1.29 with the app, 1.99 without.
  const mandarijnen = await observation("11113446");
  assert.deepEqual([mandarijnen!.shelf_price_cents, mandarijnen!.offer_price_cents], [199, 129]);
  assert.equal((await offerOf("11113446"))[0]!.wording, "-35% · 1.29 met Lidl Plus");
  // Croissants at 0.88 for everyone, 0.79 with the app.
  const croissants = await observation("11353634");
  assert.deepEqual([croissants!.shelf_price_cents, croissants!.offer_price_cents, croissants!.unit_price_cents], [88, 79, 832]);
  // Grapes at 1.19 for everyone and 1.29 with the app: the lower one stands.
  assert.equal((await observation("11150885"))!.offer_price_cents, 119);
  assert.equal((await offerOf("11150885"))[0]!.wording, "-50% · Mega deal!");
});

test("an Offer not yet in store keeps today's price, and its own only in the wording", async () => {
  await ingestLidl();
  // Grolsch from Friday 16 October: 5.49, from 7.29 today.
  const grolsch = await observation("11562615");
  assert.deepEqual([grolsch!.shelf_price_cents, grolsch!.offer_price_cents, grolsch!.unit_price_cents], [729, null, 243]);
  const [o] = await offerOf("11562615");
  assert.equal(o!.wording, "5.49 · -24% · Mega deal!");
  assert.equal(o!.is_upcoming, true);
  assert.equal(o!.starts_at.toISOString(), "2026-10-15T22:00:00.000Z");
});

test("a product arriving later at one price has no price today", async () => {
  await ingestLidl();
  // Grolsch 0.0 at 2.99 from 16 October, reduced from nothing: not sold yet.
  assert.equal(await observation("11562625"), undefined);
  const [o] = await offerOf("11562625");
  assert.deepEqual([o!.wording, o!.headline, o!.is_upcoming], ["2.99", "Grolsch 0.0", true]);
});

test("reads the pack from the price, else from its own bullet in the key facts", async () => {
  const { result } = await ingestLidl();
  assert.equal((await observation("11006952"))!.pack_text, "350 g");
  // "In verschillende varianten" is not a pack; "360 g" is.
  assert.equal((await observation("11562744"))!.pack_text, "360 g");
  assert.equal(packBulletOf("<ul><li>Veelzijdig stuk vlees</li><li>4 stuks per pak</li></ul>"), "4 stuks per pak");
  assert.equal(packBulletOf("<ul><li>Rijk aan omega 3 en vetzuren</li></ul>"), null);
  // Mandarins, Reese's and the frozen vegetables state no pack anywhere.
  assert.equal(result.counts.withoutUnitPrice, 3);
});

test("files each product under Lidl's category path, without its root", async () => {
  await ingestLidl();
  assert.deepEqual((await observation("11150885"))!.categories, ["Eten en dichtbij voedsel > Groenten & fruit > Fruit"]);
  assert.deepEqual((await observation("11562615"))!.categories, ["Wijn, bier en sterke drank > Bier & Cider"]);
});

test("never reads the images or the key facts' text", async () => {
  const { reading } = await ingestLidl();
  const text = JSON.stringify(reading);
  assert.ok(!text.includes("assets.schwarz") && !text.includes("lidl.nl/assets"));
  assert.ok(!text.includes("verschillende varianten"));
});

test("decodes the page's escaped attributes, and counts one it cannot read", () => {
  const { items, unreadable } = itemsOf(
    '<div data-grid-data="{&quot;fullTitle&quot;:&quot;Fran&#xe7;ois &amp; Zn&#39;s&quot;}"></div><div data-grid-data="{broken"></div>',
  );
  assert.equal(items[0]!.fullTitle, "François & Zn's");
  assert.equal(unreadable, 1);
});
