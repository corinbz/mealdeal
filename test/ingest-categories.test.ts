import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { truncateAll, type Db } from "../src/ingest/db.ts";
import { record } from "../src/ingest/record.ts";
import { dirkReader } from "../src/ingest/readers/dirk.ts";
import { jumboReader } from "../src/ingest/readers/jumbo.ts";
import { testDb } from "./helpers/db.ts";
import { writeFixtureArchive, FIXTURE_DATE } from "./helpers/archive.ts";

/**
 * Where each Chain files a Product in its own category tree is recorded on the
 * Product, because the Ingredient mapping (#14) needs it to tell fresh carrots
 * from carrots in a jar, in baby food, or in pet food. Every row here was
 * recorded from the 2026-10-14 archive.
 */

let db: Db;
before(async () => { db = await testDb(); });
beforeEach(async () => { await truncateAll(db); });
after(async () => { await db.end(); });

const categoriesOf = async (chain: string) =>
  Object.fromEntries((await db.query<{ name: string; categories: string[] }>(
    "SELECT name, categories FROM product WHERE chain_id = $1 ORDER BY name", [chain])).rows.map((r) => [r.name, r.categories]));

test("Dirk's department and web group are recorded on each Product", async () => {
  const root = await writeFixtureArchive({ dirk: { "products/store-66/wg-1": ["dirk-products.categories.json"] } });
  await record(db, "dirk", FIXTURE_DATE, await dirkReader.read(root, FIXTURE_DATE));
  assert.deepEqual(await categoriesOf("dirk"), {
    "Hak Wortelen extra fijn": ["Aardappelen, groente & fruit > Groenteconserven"],
    "Hollandse Winterpeen": ["Aardappelen, groente & fruit > Groente"],
    "Olvarit 6+ Maanden Tomaat Rund Aardappel Wortel": ["Kind & drogisterij > Babyvoeding vanaf 6 maanden"],
    "Purina One Kattenvoer sensitive kalkoen & rijst": ["Huishoud & huisdieren > Huisdieren"],
  });
});

test("Jumbo's category is the path of names to the category a Product was listed under", async () => {
  const root = await writeFixtureArchive({ jumbo: {
    categories: ["jumbo-categories.json"],
    "products/cat-005792": ["jumbo-products.wortels.json"],
    // The same Products listed again under another category: both are kept.
    "products/cat-005526": ["jumbo-products.wortels.json"],
  } });
  await record(db, "jumbo", FIXTURE_DATE, await jumboReader.read(root, FIXTURE_DATE));
  const recorded = await categoriesOf("jumbo");
  assert.deepEqual(recorded["Jumbo Wortelen 1 kg"], [
    "Aardappelen, groente en fruit > Groente > Wortels, knolgroenten en radijs",
    "Conserven, soepen, sauzen, oliën > Groenteconserven",
  ]);
  assert.equal(Object.keys(recorded).length, 3, "listed twice, still recorded once");
});

test("a category missing from the tree is left out rather than guessed", async () => {
  const root = await writeFixtureArchive({ jumbo: { "products/cat-999999": ["jumbo-products.wortels.json"] } });
  await record(db, "jumbo", FIXTURE_DATE, await jumboReader.read(root, FIXTURE_DATE));
  assert.deepEqual((await categoriesOf("jumbo"))["Jumbo Wortelen 1 kg"], []);
});
